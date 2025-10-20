package com.bmss.backend.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class SentimentService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String SENTIMENT_API_URL = "http://127.0.0.1:5000/analyze";

    public Map<String, Object> analyzeText(String text) {
        Map<String, Object> result = new HashMap<>();

        try {
            Map<String, String> request = new HashMap<>();
            request.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(SENTIMENT_API_URL, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                result.put("status", "success");
                result.put("label", response.getBody().get("label"));
                result.put("score", response.getBody().get("score"));
                result.put("analyzed_at", response.getBody().get("analyzed_at"));
            } else {
                result.put("status", "error");
                result.put("message", "Resposta inválida da API Flask");
            }

        } catch (Exception e) {
            result.put("status", "error");
            result.put("message", e.getMessage());
        }

        return result;
    }
}
