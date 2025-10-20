package com.bmss.backend.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class TendenciasController {

    @GetMapping("/tendencias")
    public ResponseEntity<List<Map<String, Object>>> getTendencias() {
        List<Map<String, Object>> tendencias = new ArrayList<>();

        // 🔹 Mock de dados — substitua depois por lógica real
        tendencias.add(Map.of("day", "Dia 1", "positive", 45, "neutral", 30, "negative", 25));
        tendencias.add(Map.of("day", "Dia 2", "positive", 48, "neutral", 29, "negative", 23));
        tendencias.add(Map.of("day", "Dia 3", "positive", 50, "neutral", 28, "negative", 22));
        tendencias.add(Map.of("day", "Dia 4", "positive", 52, "neutral", 30, "negative", 18));
        tendencias.add(Map.of("day", "Dia 5", "positive", 40, "neutral", 27, "negative", 33));

        return ResponseEntity.ok(tendencias);
    }
}
