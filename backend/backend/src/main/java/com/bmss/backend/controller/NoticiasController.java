package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NoticiasService noticiasService;

    @Autowired
    private ItemRepository itemRepository;

    // ============================================================
    // 🔹 Endpoint principal - Busca as últimas notícias + análise rápida
    // ============================================================
    @GetMapping("/ultimas")
    public ResponseEntity<List<FeedDTO>> ultimas(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);

        // Envia para análise rápida via Flask
        List<String> textos = noticias.stream()
                .map(n -> n.getTitle() + ". " + n.getDescription())
                .collect(Collectors.toList());

        List<Map<String, Object>> analises = noticiasService.analyzeBatch(textos);

        for (int i = 0; i < noticias.size() && i < analises.size(); i++) {
            Map<String, Object> analise = analises.get(i);
            noticias.get(i).setSentimento((String) analise.getOrDefault("label", "neutral"));
            noticias.get(i).setScore(Double.valueOf(analise.getOrDefault("score", 0.0).toString()));
        }

        return ResponseEntity.ok(noticias);
    }

    // ============================================================
    // 🔹 Retorna notícias armazenadas no banco (todas as categorias)
    // ============================================================
    @GetMapping("/todas")
    public ResponseEntity<List<Item>> listarTodas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        Page<Item> pageResult = itemRepository.findAll(pageable);
        return ResponseEntity.ok(pageResult.getContent());
    }

    // ============================================================
    // 🔹 Retorna notícias filtradas por categoria (ex: /categoria/politica)
    // ============================================================
    @GetMapping("/categoria/{nome}")
    public ResponseEntity<List<Item>> listarPorCategoria(@PathVariable String nome) {
        List<Item> itens = itemRepository.findByCategory_NameIgnoreCase(nome);
        return ResponseEntity.ok(itens);
    }
}
