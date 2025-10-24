package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class SentimentoController {

    private final ItemRepository itemRepository;

    public SentimentoController(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    // ============================================================
    // 🔹 Calcula sentimento global com base nas últimas notícias analisadas
    // ============================================================
    @GetMapping("/sentimento")
    public ResponseEntity<Map<String, Double>> calcularSentimentoGeral(
            @RequestParam(defaultValue = "50") int limit
    ) {
        System.out.println("📊 [GET] /api/v1/sentimento → calculando sentimento com base nas últimas " + limit + " notícias.");

        // 🔍 Busca as últimas notícias com limite dinâmico
        var pageable = PageRequest.of(0, limit, Sort.by("analyzedAt").descending());
        List<Item> itens = itemRepository.findAllByOrderByAnalyzedAtDesc(pageable);

        if (itens.isEmpty()) {
            System.out.println("⚠️ Nenhum item encontrado para cálculo de sentimento.");
            return ResponseEntity.ok(Map.of(
                    "positive", 0.0,
                    "neutral", 0.0,
                    "negative", 0.0
            ));
        }

        // 🔹 Conta quantos são positivos, neutros e negativos
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

        System.out.println("📈 Resultado → Positivo: " + p + " | Neutro: " + n + " | Negativo: " + ng);

        return ResponseEntity.ok(Map.of(
                "positive", Math.round(p * 100.0) / 100.0, // porcentagem com duas casas
                "neutral", Math.round(n * 100.0) / 100.0,
                "negative", Math.round(ng * 100.0) / 100.0
        ));
    }
}
