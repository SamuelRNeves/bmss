package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NoticiasService noticiasService;

    // ============================================================
    // 🔹 Lista as últimas notícias (agora com limite maior e análise)
    // ============================================================
    @GetMapping("/ultimas")
    public ResponseEntity<List<FeedDTO>> ultimas(
            @RequestParam(defaultValue = "30") int limit, // ⬅️ aumentamos o limite padrão
            @RequestParam(defaultValue = "bitcoin") String q
    ) {
        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);

        // 🔹 Evita chamadas desnecessárias ao Flask se não houver notícias
        if (noticias.isEmpty()) {
            return ResponseEntity.ok(noticias);
        }

        // 🔹 Monta os textos (título + descrição) para análise
        List<String> textos = noticias.stream()
                .map(n -> n.getTitle() + ". " + n.getDescription())
                .collect(Collectors.toList());

        // 🔹 Envia para o Flask em lote
        List<Map<String, Object>> analises = noticiasService.analyzeBatch(textos);

        // 🔹 Mapeia sentimentos e scores de volta para as notícias
        for (int i = 0; i < noticias.size() && i < analises.size(); i++) {
            Map<String, Object> analise = analises.get(i);
            noticias.get(i).setSentimento((String) analise.getOrDefault("label", "neutral"));
            noticias.get(i).setScore(Double.valueOf(analise.getOrDefault("score", 0.0).toString()));
        }

        System.out.println("✅ " + noticias.size() + " notícias enviadas ao frontend (" + q + ")");
        return ResponseEntity.ok(noticias);
    }
}
