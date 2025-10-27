package com.bmss.backend.controller;

import com.bmss.backend.repository.SentimentRepository;
import com.bmss.backend.model.Sentiment;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "http://localhost:3000")
public class TendenciasController {

    @Autowired
    private SentimentRepository sentimentRepository;

    @GetMapping("/tendencias")
    public ResponseEntity<List<Map<String, Object>>> getTendencias() {
        // Busca todos os sentimentos do banco
        List<Sentiment> sentimentos = sentimentRepository.findAll();

        if (sentimentos.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        // Agrupa por dia (baseado no campo createdAt)
        Map<LocalDate, List<Sentiment>> agrupados = sentimentos.stream()
                .filter(s -> s.getCreatedAt() != null)
                .collect(Collectors.groupingBy(s ->
                        s.getCreatedAt()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate()
                ));

        // Monta a lista final (dia → contagem de labels)
        List<Map<String, Object>> tendencias = agrupados.entrySet().stream()
                .sorted(Map.Entry.comparingByKey()) // ordena por data
                .map(entry -> {
                    LocalDate dia = entry.getKey();
                    List<Sentiment> lista = entry.getValue();

                    long positivos = lista.stream().filter(s -> "positive".equalsIgnoreCase(s.getLabel())).count();
                    long neutros = lista.stream().filter(s -> "neutral".equalsIgnoreCase(s.getLabel())).count();
                    long negativos = lista.stream().filter(s -> "negative".equalsIgnoreCase(s.getLabel())).count();

                    long total = Math.max(1, lista.size()); // evita divisão por zero

                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("day", dia.toString());
                    map.put("positive", (int) ((positivos * 100.0) / total));
                    map.put("neutral", (int) ((neutros * 100.0) / total));
                    map.put("negative", (int) ((negativos * 100.0) / total));

                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(tendencias);
    }
}
