package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NoticiasService;
import com.bmss.backend.service.SentimentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000") // Permite chamadas do frontend Next.js
@RestController
@RequestMapping("/api/v1/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private NoticiasService newsService;

    @Autowired
    private SentimentService sentimentService;

    // ============================================================
    // 🔹 Importar e analisar automaticamente notícias externas
    // ============================================================
    @PostMapping("/import")
    public ResponseEntity<?> importNews(@RequestParam(defaultValue = "bitcoin") String keyword) {
        try {
            newsService.fetchAndStoreNews(keyword);
            return ResponseEntity.ok("✅ Notícias importadas e analisadas com sucesso!");
        } catch (Exception e) {
            System.err.println("❌ Erro ao importar notícias: " + e.getMessage());
            return ResponseEntity.internalServerError()
                    .body("Erro ao importar notícias: " + e.getMessage());
        }
    }

    // ============================================================
    // 🔹 Analisar o sentimento de uma notícia específica (por ID)
    // ============================================================
    @PostMapping("/{id}/analyze")
    public ResponseEntity<?> analyzeItem(@PathVariable Integer id) {
        return itemRepository.findById(id)
                .map(item -> {
                    Map<String, Object> result = sentimentService.analyzeText(item.getText());

                    if (result != null && result.get("label") != null) {
                        item.setSentimentLabel((String) result.get("label"));
                        Object scoreObj = result.getOrDefault("score", 0.0);
                        item.setSentimentScore(Double.valueOf(scoreObj.toString()));
                        item.setAnalyzedAt(LocalDateTime.now());
                        itemRepository.save(item);
                    }

                    return ResponseEntity.ok(result);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ============================================================
    // 🔹 Listar todas as notícias armazenadas no banco
    // ============================================================
    @GetMapping
    public ResponseEntity<List<Item>> getAllItems() {
        List<Item> itens = itemRepository.findAll();
        if (itens.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(itens);
    }

    // ============================================================
    // 🔹 Buscar uma notícia específica por ID
    // ============================================================
    @GetMapping("/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable Integer id) {
        return itemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ============================================================
    // 🔹 Criar manualmente uma nova notícia
    // ============================================================
    @PostMapping
    public ResponseEntity<Item> criarItem(@RequestBody Item item) {
        item.setCreatedAt(LocalDateTime.now());
        Item saved = itemRepository.save(item);
        return ResponseEntity.ok(saved);
    }

    // ============================================================
    // 🔹 Atualizar um item existente
    // ============================================================
    @PutMapping("/{id}")
    public ResponseEntity<Item> updateItem(@PathVariable Integer id, @RequestBody Item updatedItem) {
        return itemRepository.findById(id)
                .map(item -> {
                    item.setTitle(updatedItem.getTitle());
                    item.setText(updatedItem.getText());
                    item.setUrl(updatedItem.getUrl());
                    item.setPublishedAt(updatedItem.getPublishedAt());
                    item.setSource(updatedItem.getSource());
                    item.setSentimentLabel(updatedItem.getSentimentLabel());
                    item.setSentimentScore(updatedItem.getSentimentScore());
                    item.setAnalyzedAt(LocalDateTime.now());
                    Item saved = itemRepository.save(item);
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ============================================================
    // 🔹 Excluir uma notícia por ID
    // ============================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Integer id) {
        return itemRepository.findById(id)
                .map(item -> {
                    itemRepository.delete(item);
                    return ResponseEntity.ok("🗑️ Item excluído com sucesso!");
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
