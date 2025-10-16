package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NewsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private NewsService newsService;

    // ✅ Importar notícias da API externa
    @GetMapping("/import-news")
    public ResponseEntity<String> importNews(@RequestParam(defaultValue = "bitcoin") String keyword) {
        newsService.fetchAndStoreNews(keyword);
        return ResponseEntity.ok("Notícias importadas com sucesso!");
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
            }).orElse(ResponseEntity.notFound().build());
    }

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
