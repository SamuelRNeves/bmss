package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class SentimentoController {

    @Autowired
    private ItemRepository itemRepository;

    // ============================================================
    // 🔹 Calcula sentimento global com base nas últimas notícias analisadas
    // ============================================================
    @GetMapping("/sentimento")
    public ResponseEntity<Map<String, Double>> calcularSentimentoGeral() {

        // Busca os 50 itens mais recentes analisados
        List<Item> itens = itemRepository.findTop50ByOrderByAnalyzedAtDesc();

        if (itens.isEmpty()) {
            // Nenhum item no banco → tudo zerado
            return ResponseEntity.ok(Map.of(
                    "positive", 0.0,
                    "neutral", 0.0,
                    "negative", 0.0
            ));
        }

        // Conta quantos são positivos, neutros e negativos
        long positivos = itens.stream()
                .filter(i -> "positive".equalsIgnoreCase(i.getSentimentLabel()))
                .count();

        long neutros = itens.stream()
                .filter(i -> "neutral".equalsIgnoreCase(i.getSentimentLabel()))
                .count();

        long negativos = itens.stream()
                .filter(i -> "negative".equalsIgnoreCase(i.getSentimentLabel()))
                .count();

        long total = itens.size();

        double p = (double) positivos / total;
        double n = (double) neutros / total;
        double ng = (double) negativos / total;

        System.out.println("📊 Sentimento calculado com base em " + total + " itens analisados.");

        return ResponseEntity.ok(Map.of(
                "positive", Math.round(p * 100.0) / 100.0,
                "neutral", Math.round(n * 100.0) / 100.0,
                "negative", Math.round(ng * 100.0) / 100.0
        ));
    }
}
