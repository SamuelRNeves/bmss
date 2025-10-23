package com.bmss.backend.controller;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.service.NoticiasService;
import org.springframework.beans.factory.annotation.Autowired;
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

    // 🔹 Lista as últimas notícias
    @GetMapping("/ultimas")
    public ResponseEntity<List<FeedDTO>> ultimas(
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(defaultValue = "bitcoin") String q) {

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
        return ResponseEntity.ok(noticias);
    }

}
