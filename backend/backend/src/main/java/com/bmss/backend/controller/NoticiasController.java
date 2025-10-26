package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.exception.SentimentAnalysisException;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NoticiasService;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class NoticiasController {

    private final NoticiasService noticiasService;
    private final ItemRepository itemRepository;

    public NoticiasController(NoticiasService noticiasService, ItemRepository itemRepository) {
        this.noticiasService = noticiasService;
        this.itemRepository = itemRepository;
    }

    // ============================================================
    // 🔹 Endpoint: buscar e atualizar últimas notícias antes de retornar
    // ============================================================
    @GetMapping("/ultimas")
    public ResponseEntity<Map<String, Object>> getUltimasNoticias(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        System.out.println("📡 [GET] /api/v1/noticias/ultimas → buscando últimas " + limit + " notícias salvas no banco.");

        try {
            // 🔄 Atualiza banco com novas notícias do Flask/GNews antes de buscar
            noticiasService.fetchAndStoreNews(q);

            // 🔍 Busca as mais recentes no banco (usando Pageable dinâmico)
            var pageable = PageRequest.of(0, limit, Sort.by("analyzedAt").descending());
            List<Item> items = itemRepository.findAllByOrderByAnalyzedAtDesc(pageable);

            List<FeedDTO> payload = items.stream().map(it -> new FeedDTO(
                    it.getTitle(),
                    it.getText(),
                    it.getUrl(),
                    it.getSourceName(),
                    it.getPublishedAt() != null ? it.getPublishedAt().toString() : null,
                    it.getSentimentLabel(),
                    it.getSentimentScore()
            )).collect(Collectors.toList());

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("total", payload.size());
            resp.put("data", payload);
            resp.put("message", payload.isEmpty()
                    ? "⚠️ Nenhuma notícia analisada encontrada."
                    : "✅ Últimas notícias recentes retornadas com sucesso!");

            return ResponseEntity.ok(resp);

        } catch (SentimentAnalysisException e) {
            e.printStackTrace();
            return ResponseEntity.status(502).body(Map.of(
                    "error", "❌ Falha ao contatar microserviço de sentimento: " + e.getMessage()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", "❌ Falha ao atualizar e buscar notícias: " + e.getMessage()
            ));
        }
    }

    // ============================================================
    // 🔹 Endpoint: aciona manualmente a análise e persistência
    // ============================================================
    @PostMapping("/analisar")
    public ResponseEntity<Map<String, Object>> analisarNoticias(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        System.out.println("🧠 [POST] /api/v1/noticias/analisar → iniciando nova análise para: " + q);

        try {
            noticiasService.fetchAndStoreNews(q);
            return ResponseEntity.ok(Map.of(
                    "message", "✅ Análise concluída e dados salvos no banco!"
            ));
        } catch (SentimentAnalysisException e) {
            e.printStackTrace();
            return ResponseEntity.status(502).body(Map.of(
                    "error", "❌ Falha ao contatar microserviço de sentimento: " + e.getMessage()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", "❌ Falha ao processar notícias: " + e.getMessage()
            ));
        }
    }
}
