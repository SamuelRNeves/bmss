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

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class TendenciasController {

    @Autowired
    private NoticiasService noticiasService;

    @GetMapping("/tendencias")
    public ResponseEntity<List<Map<String, Object>>> getTendencias(
            @RequestParam(defaultValue = "bitcoin") String q,
            @RequestParam(defaultValue = "30") int limit) {

        List<FeedDTO> noticias = noticiasService.buscarNoticias(limit, q);
        if (noticias.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Map<String, Object>> tendencias = noticiasService.calcularTendenciaPorDia(noticias);
        return ResponseEntity.ok(tendencias);
    }
}
