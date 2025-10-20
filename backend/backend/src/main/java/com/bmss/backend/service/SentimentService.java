package com.bmss.backend.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class SentimentService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String SENTIMENT_API_URL = "http://localhost:5000/analyze";

    public Map<String, Object> analyzeText(String text) {
        try {
            Map<String, String> request = new HashMap<>();
            request.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(SENTIMENT_API_URL, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body != null) {
                body.put("status", "success");
                return body;
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return error;
        }
        return null;
    }
}
