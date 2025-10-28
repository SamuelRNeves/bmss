package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controlador responsável por gerenciar endpoints de notícias e tweets.
 * Todas as respostas seguem o formato: { data, meta, message }.
 */
@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class NoticiasController {

    private static final Logger log = LoggerFactory.getLogger(NoticiasController.class);
    private final NoticiasService noticiasService;

    // ======================================================
    // 🔹 Buscar últimas notícias (com análise)
    // ======================================================
    @GetMapping("/ultimas")
    public ResponseEntity<Map<String, Object>> getUltimasNoticias(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        log.info("📰 Requisição recebida: /noticias/ultimas?limit={}&q={}", limit, q);
        List<FeedDTO> noticias = Collections.emptyList();

        try {
            noticias = noticiasService.buscarNoticias(limit, q);
        } catch (Exception e) {
            log.error("❌ Erro ao buscar notícias: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao buscar notícias: " + e.getMessage()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "data", noticias,
                "meta", Map.of("total", noticias.size()),
                "message", "✅ Notícias retornadas com sucesso."
        ));
    }

    // ======================================================
    // 🔹 Força nova análise de notícias (FinBERT + RoBERTa)
    // ======================================================
    @PostMapping("/analisar")
    public ResponseEntity<Map<String, Object>> analisarNoticias(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        log.info("⚙️ Disparando nova análise de notícias (limit={}, q={})", limit, q);
        try {
            noticiasService.fetchAndStoreNews(q);
            return ResponseEntity.ok(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "✅ Análise de notícias iniciada com sucesso."
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao iniciar análise: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao iniciar análise: " + e.getMessage()
            ));
        }
    }

    // ======================================================
    // 🔹 Buscar últimos tweets
    // ======================================================
    @GetMapping("/tweets/ultimos")
    public ResponseEntity<Map<String, Object>> getUltimosTweets(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        log.info("🐦 Requisição recebida: /noticias/tweets/ultimos?limit={}&q={}", limit, q);
        List<FeedDTO> tweets = Collections.emptyList();

        try {
            tweets = noticiasService.buscarTweets(limit, q);
        } catch (Exception e) {
            log.error("❌ Erro ao buscar tweets: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao buscar tweets: " + e.getMessage()
            ));
        }

        if (tweets.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "⚠️ Nenhum tweet encontrado."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "data", tweets,
                "meta", Map.of("total", tweets.size()),
                "message", "✅ Tweets retornados com sucesso."
        ));
    }

    // ======================================================
    // 🔹 Força nova análise de tweets
    // ======================================================
    @PostMapping("/analisar-tweets")
    public ResponseEntity<Map<String, Object>> analisarTweets(
            @RequestParam(defaultValue = "bitcoin") String q) {

        log.info("🐦⚙️ Disparando nova análise de tweets para '{}'", q);
        try {
            noticiasService.fetchAndStoreTweets(q);
            return ResponseEntity.ok(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "✅ Análise de tweets iniciada com sucesso."
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao iniciar análise de tweets: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao iniciar análise de tweets: " + e.getMessage()
            ));
        }
    }
}
