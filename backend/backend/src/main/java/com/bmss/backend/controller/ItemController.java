package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NewsService;
import com.bmss.backend.service.SentimentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000") // permite chamadas do React
@RestController
@RequestMapping("/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private NewsService newsService;

    @Autowired
    private SentimentService sentimentService;

    // ✅ Importar notícias da API externa
    @PostMapping("/import-news")
    public ResponseEntity<String> importNews(@RequestParam(defaultValue = "bitcoin") String keyword) {
        newsService.fetchAndStoreNews(keyword);
        return ResponseEntity.ok("Notícias importadas com sucesso!");
    }

    // ✅ Analisar sentimento de uma notícia específica
    @PostMapping("/{id}/analyze")
    public ResponseEntity<?> analyzeItem(@PathVariable Integer id) {
        return itemRepository.findById(id)
            .map(item -> {
                Map<String, Object> result = sentimentService.analyzeText(item.getText());

                if (result != null && "success".equals(result.get("status"))) {
                    item.setSentimentLabel((String) result.get("label"));
                    item.setSentimentScore(Double.valueOf(result.get("score").toString()));
                    item.setAnalyzedAt(LocalDateTime.now());
                    itemRepository.save(item);
                }

                return ResponseEntity.ok(result);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Listar todas as notícias
    @GetMapping
    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    // Buscar notícia por ID
    @GetMapping("/{id}")
    public Item getItemById(@PathVariable Integer id) {
        return itemRepository.findById(id).orElse(null);
    }

    // Criar uma nova notícia
    @PostMapping
    public ResponseEntity<Item> criarItem(@RequestBody Item item) {
        Item saved = itemRepository.save(item);
        return ResponseEntity.ok(saved);
    }

    // Atualizar um item existente
    @PutMapping("/{id}")
    public ResponseEntity<Item> updateItem(@PathVariable Integer id, @RequestBody Item updatedItem) {
        return itemRepository.findById(id)
            .map(item -> {
                item.setTitle(updatedItem.getTitle());
                item.setText(updatedItem.getText());
                item.setUrl(updatedItem.getUrl());
                item.setPublishedAt(updatedItem.getPublishedAt());
                item.setSource(updatedItem.getSource());
                Item saved = itemRepository.save(item);
                return ResponseEntity.ok(saved);
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // Excluir item
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Integer id) {
        return itemRepository.findById(id)
            .map(item -> {
                itemRepository.delete(item);
                return ResponseEntity.ok().build();
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
