package com.bmss.backend.controller;

import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

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

    // Criar nova notícia
    @PostMapping
    public Item createItem(@RequestBody Item item) {
        return itemRepository.save(item);
    }
}
