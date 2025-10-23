package com.bmss.backend.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SentimentService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String PYTHON_API_URL_SINGLE = "http://localhost:5000/analyze";
    private static final String PYTHON_API_URL_BATCH = "http://localhost:5000/analyze-batch";

    // ============================================================
    // 🔹 Análise individual (texto único)
    // ============================================================
    public Map<String, Object> analyzeText(String text) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (text == null || text.isBlank()) {
                result.put("label", "neutral");
                result.put("score", 0.0);
                result.put("analyzed_at", LocalDateTime.now().toString());
                return result;
            }

            Map<String, String> request = new HashMap<>();
            request.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(PYTHON_API_URL_SINGLE, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                result.put("label", response.getBody().getOrDefault("label", "neutral"));
                result.put("score", response.getBody().getOrDefault("score", 0.0));
                result.put("analyzed_at", response.getBody().getOrDefault("analyzed_at", LocalDateTime.now().toString()));
            } else {
                fallback(result);
            }

        } catch (Exception e) {
            System.err.println("⚠️ Erro ao conectar com Flask (analyzeText): " + e.getMessage());
            fallback(result);
        }

        return result;
    }

    // ============================================================
    // 🔹 Análise em lote (mais rápida e precisa)
    // ============================================================
    public List<Map<String, Object>> analyzeBatch(List<String> textos) {
        if (textos == null || textos.isEmpty()) return Collections.emptyList();

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Envia no formato [{ "text": "..." }, ...]
            List<Map<String, String>> payload = textos.stream()
                    .filter(Objects::nonNull)
                    .filter(t -> !t.isBlank())
                    .map(t -> Map.of("text", t))
                    .toList();

            HttpEntity<List<Map<String, String>>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<List> response = restTemplate.exchange(PYTHON_API_URL_BATCH, HttpMethod.POST, entity, List.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            }

        } catch (Exception e) {
            System.err.println("⚠️ Erro ao conectar com Flask (analyzeBatch): " + e.getMessage());
        }

        // 🔸 Fallback neutro se Flask estiver offline
        return textos.stream().map(t -> {
            Map<String, Object> f = new HashMap<>();
            f.put("label", "neutral");
            f.put("score", 0.0);
            f.put("analyzed_at", LocalDateTime.now().toString());
            return f;
        }).toList();
    }

    // ============================================================
    // 🔹 Fallback padrão (evita quebra de fluxo)
    // ============================================================
    private void fallback(Map<String, Object> result) {
        result.put("label", "neutral");
        result.put("score", 0.0);
        result.put("analyzed_at", LocalDateTime.now().toString());
    }
}
