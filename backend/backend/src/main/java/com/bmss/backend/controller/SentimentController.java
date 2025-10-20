package com.bmss.backend.controller;

import com.bmss.backend.service.SentimentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class SentimentController {

    @Autowired
    private SentimentService sentimentService;

    // Endpoint: /api/v1/sentimento
    @GetMapping("/sentimento")
    public ResponseEntity<Map<String, Object>> getSentimentoExample() {
        // 🔹 Aqui futuramente você vai calcular os percentuais agregados
        // Por enquanto, podemos testar chamando o modelo Python diretamente:
        Map<String, Object> result = sentimentService.analyzeText("Bitcoin atingiu novo recorde!");
        return ResponseEntity.ok(result);
    }
}
