package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class SentimentoController {

    @Autowired
    private NoticiasService noticiasService;

    @GetMapping("/sentimento")
    public ResponseEntity<Map<String, Double>> calcularSentimentoGeral(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
        if (noticias.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "positive", 0.0,
                    "neutral", 0.0,
                    "negative", 0.0
            ));
        }

        int positivos = 0, neutros = 0, negativos = 0;

        for (FeedDTO feed : noticias) {
            String label = feed.getSentimento() != null ? feed.getSentimento().toLowerCase() : "neutral";
            switch (label) {
                case "positive":
                    positivos++;
                    break;
                case "negative":
                    negativos++;
                    break;
                default:
                    neutros++;
                    break;
            }
        }

        double total = positivos + neutros + negativos;
        if (total == 0) {
            total = 1;
        }

        Map<String, Double> resultado = new HashMap<>();
        resultado.put("positive", positivos / total);
        resultado.put("neutral", neutros / total);
        resultado.put("negative", negativos / total);

        return ResponseEntity.ok(resultado);
    }
}
