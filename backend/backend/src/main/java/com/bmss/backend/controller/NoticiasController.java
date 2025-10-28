package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.*;

/**
 * Controlador responsável por endpoints de notícias e tweets.
 * Todas as respostas seguem o formato: { data, meta, message }.
 */
@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class NoticiasController {

    private static final Logger log = LoggerFactory.getLogger(NoticiasController.class);
    private final NoticiasService noticiasService;

    // ==========================
    // Util: polling simples
    // ==========================
    private List<FeedDTO> waitUntilAnalyzed(java.util.function.Supplier<List<FeedDTO>> supplier,
                                            Duration timeout,
                                            Duration interval) {
        long deadline = System.currentTimeMillis() + timeout.toMillis();
        List<FeedDTO> data = supplier.get();

        // Considera "analisado" quando existir ao menos 1 item com sentimento não nulo ou score > 0
        while (System.currentTimeMillis() < deadline) {
            boolean analyzed = data.stream().anyMatch(d ->
                    (d.getSentimento() != null && !d.getSentimento().isBlank()) ||
                    (d.getScore() != null && d.getScore() > 0)
            );
            if (analyzed) break;
            try {
                Thread.sleep(interval.toMillis());
            } catch (InterruptedException ignored) {}
            data = supplier.get();
        }
        return data;
    }

    // ======================================================
    //  Buscar últimas notícias
    // ======================================================
   @GetMapping("/ultimas")
public ResponseEntity<Map<String, Object>> getUltimasNoticias(
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(defaultValue = "bitcoin") String q,
        @RequestParam(defaultValue = "news") String type,
        @RequestParam(defaultValue = "false") boolean analyze
) {
    log.info("📡 Requisição: /noticias/ultimas?type={}&analyze={}", type, analyze);
    List<FeedDTO> resultados = Collections.emptyList();

    try {
        if ("tweets".equalsIgnoreCase(type)) {
            // ✅ Força análise antes de retornar tweets
            if (analyze) {
                log.info("🐦 Solicitado analyze=true — analisando tweets via Flask...");
                noticiasService.fetchAndStoreTweets(q);
            }
            resultados = noticiasService.buscarTweets(limit, q);
        } else {
            // ✅ Mantém comportamento para notícias
            if (analyze) {
                log.info("📰 Solicitado analyze=true — analisando notícias via Flask...");
                noticiasService.fetchAndStoreNews(q);
            }
            resultados = noticiasService.buscarNoticias(limit, q);
        }

    } catch (Exception e) {
        log.error("❌ Erro ao buscar {}: {}", type, e.getMessage());
        return ResponseEntity.internalServerError().body(Map.of(
                "data", Collections.emptyList(),
                "meta", Map.of("total", 0),
                "message", "❌ Erro ao buscar " + type + ": " + e.getMessage()
        ));
    }

    return ResponseEntity.ok(Map.of(
            "data", resultados,
            "meta", Map.of("total", resultados.size()),
            "message", "✅ " + type + " retornados com sucesso."
    ));
}


    // ======================================================
    // 🔹 Força nova análise de notícias e já retorna analisadas
    // ======================================================
    @PostMapping("/analisar")
    public ResponseEntity<Map<String, Object>> analisarNoticias(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "12") int limit
    ) {
        log.info("🛠️ POST /noticias/analisar?q={}&limit={}", q, limit);
        try {
            noticiasService.fetchAndStoreNews(q);

            // Polling curto para garantir que o front já receba as análises atualizadas
            List<FeedDTO> analisadas = waitUntilAnalyzed(
                    () -> safeNoticias(limit, q),
                    Duration.ofSeconds(6),
                    Duration.ofMillis(300)
            );

            return ResponseEntity.ok(Map.of(
                    "data", analisadas,
                    "meta", Map.of("total", analisadas.size()),
                    "message", "✅ Análise concluída e notícias atualizadas."
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao analisar notícias: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao analisar notícias: " + e.getMessage()
            ));
        }
    }

    // ======================================================
    // 🔹 Buscar últimos tweets (já analisados se desejar)
    //    analyze=true por padrão para manter UX homogênea
    // ======================================================
    @GetMapping("/tweets/ultimos")
    public ResponseEntity<Map<String, Object>> getUltimosTweets(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "true") boolean analyze
    ) {
        log.info("🐦 GET /noticias/tweets/ultimos?limit={}&q={}&analyze={}", limit, q, analyze);

        try {
            List<FeedDTO> tweets;

            if (analyze) {
                noticiasService.fetchAndStoreTweets(q);
                tweets = waitUntilAnalyzed(
                        () -> safeTweets(limit, q),
                        Duration.ofSeconds(6),
                        Duration.ofMillis(300)
                );
            } else {
                tweets = safeTweets(limit, q);
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
        } catch (Exception e) {
            log.error("❌ Erro ao buscar/analisar tweets: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao buscar/analisar tweets: " + e.getMessage()
            ));
        }
    }

    // ======================================================
    // 🔹 Força nova análise de tweets e já retorna analisados
    // ======================================================
    @PostMapping("/analisar-tweets")
    public ResponseEntity<Map<String, Object>> analisarTweets(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        log.info("🐦⚙️ POST /noticias/analisar-tweets?q={}&limit={}", q, limit);
        try {
            noticiasService.fetchAndStoreTweets(q);

            List<FeedDTO> analisados = waitUntilAnalyzed(
                    () -> safeTweets(limit, q),
                    Duration.ofSeconds(6),
                    Duration.ofMillis(300)
            );

            return ResponseEntity.ok(Map.of(
                    "data", analisados,
                    "meta", Map.of("total", analisados.size()),
                    "message", "✅ Análise de tweets concluída."
            ));
        } catch (Exception e) {
            log.error("❌ Erro ao analisar tweets: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "data", Collections.emptyList(),
                    "meta", Map.of("total", 0),
                    "message", "❌ Erro ao analisar tweets: " + e.getMessage()
            ));
        }
    }

    // ==========================
    // Helpers seguros
    // ==========================
    private List<FeedDTO> safeNoticias(int limit, String q) {
        try {
            return noticiasService.buscarNoticias(limit, q);
        } catch (Exception e) {
            log.warn("⚠️ Falha ao buscar noticias (safe): {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<FeedDTO> safeTweets(int limit, String q) {
        try {
            return noticiasService.buscarTweets(limit, q);
        } catch (Exception e) {
            log.warn("⚠️ Falha ao buscar tweets (safe): {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}