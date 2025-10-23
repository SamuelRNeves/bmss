package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.dto.NoticiasResponseDTO;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NoticiasService noticiasService;

    // 🔹 Lista as últimas notícias
    @GetMapping("/ultimas")
    public ResponseEntity<NoticiasResponseDTO> ultimas(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        NoticiasResponseDTO response = noticiasService.buscarNoticias(limit, q);
        List<FeedDTO> noticias = response.getItems();

        if (!noticias.isEmpty()) {
            List<String> textos = noticias.stream()
                    .map(n -> n.getTitle() + ". " + n.getDescription())
                    .collect(Collectors.toList());

            List<Map<String, Object>> analises = noticiasService.analyzeBatch(textos);

            for (int i = 0; i < noticias.size() && i < analises.size(); i++) {
                Map<String, Object> analise = analises.get(i);
                noticias.get(i).setSentimento((String) analise.getOrDefault("label", "neutral"));
                noticias.get(i).setScore(Double.valueOf(analise.getOrDefault("score", 0.0).toString()));
            }
        }

        return ResponseEntity.ok(response);
    }

}
