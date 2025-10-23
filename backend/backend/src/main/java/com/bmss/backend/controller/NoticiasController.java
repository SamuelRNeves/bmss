package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/noticias")
@CrossOrigin(origins = "http://localhost:3000")
public class NoticiasController {

    @Autowired
    private NoticiasService noticiasService;

    @Autowired
    private ItemRepository itemRepository;

    // 🔹 Lista as últimas notícias
    @GetMapping("/ultimas")
    public ResponseEntity<List<FeedDTO>> ultimas(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
        return ResponseEntity.ok(noticias);
    }

    // ============================================================
    // 🔹 Notícias persistidas (ex.: histórico para dashboards)
    // ============================================================
    @GetMapping("/todas")
    public ResponseEntity<List<Item>> listarTodas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        Page<Item> pageResult = itemRepository.findAll(pageable);
        return ResponseEntity.ok(pageResult.getContent());
    }

}
