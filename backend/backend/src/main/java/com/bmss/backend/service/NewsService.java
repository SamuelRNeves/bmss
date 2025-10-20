package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import java.time.*;
import java.util.*;

@Service
public class NewsService {

    private static final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private static final String NEWS_API_URL =
        "https://newsapi.org/v2/everything?q=bitcoin&language=pt&sortBy=publishedAt&pageSize=5&apiKey=" + NEWS_API_KEY;

    private static final String SENTIMENT_API_URL = "http://localhost:5000/analyze";
    private static final RestTemplate restTemplate = new RestTemplate();

    private List<FeedDTO> cacheNoticias = new ArrayList<>();
    private LocalDateTime ultimaAtualizacao = null;

    public List<FeedDTO> getLatestNews() {
        // Cache de 10 minutos
        if (ultimaAtualizacao != null &&
                Duration.between(ultimaAtualizacao, LocalDateTime.now()).toMinutes() < 10 &&
                !cacheNoticias.isEmpty()) {
            return cacheNoticias;
        }

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(NEWS_API_URL, Map.class);
            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");

            List<FeedDTO> feedList = new ArrayList<>();

            for (Map<String, Object> article : articles) {
                FeedDTO dto = new FeedDTO();
                dto.setTitle((String) article.get("title"));
                dto.setDescription((String) article.get("description"));
                dto.setUrl((String) article.get("url"));
                dto.setSource(((Map<String, Object>) article.get("source")).get("name").toString());
                dto.setPublishedAt((String) article.get("publishedAt"));

                // 🔹 Análise de Sentimento (Python)
                Map<String, String> request = new HashMap<>();
                request.put("text", dto.getTitle() + ". " + dto.getDescription());
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

                try {
                    ResponseEntity<Map> sentimentResponse =
                        restTemplate.postForEntity(SENTIMENT_API_URL, entity, Map.class);
                    Map<String, Object> result = sentimentResponse.getBody();

                    if (result != null) {
                        dto.setSentimento((String) result.get("label"));
                        dto.setScore(Double.parseDouble(result.get("score").toString()));
                    } else {
                        dto.setSentimento("neutral");
                        dto.setScore(0.0);
                    }

                } catch (Exception e) {
                    dto.setSentimento("neutral");
                    dto.setScore(0.0);
                }

                feedList.add(dto);
            }

            cacheNoticias = feedList;
            ultimaAtualizacao = LocalDateTime.now();

            return feedList;

        } catch (Exception e) {
            e.printStackTrace();
            return cacheNoticias; // retorna cache anterior se erro
        }
    }
    public void fetchAndStoreNews(String keyword) {
        try {
            String url = "https://newsapi.org/v2/everything?q=" + keyword +
                    "&language=pt&sortBy=publishedAt&pageSize=10&apiKey=" + NEWS_API_KEY;
    
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");
    
            for (Map<String, Object> article : articles) {
                String title = (String) article.get("title");
                String description = (String) article.get("description");
                String source = ((Map<String, Object>) article.get("source")).get("name").toString();
                String publishedAt = (String) article.get("publishedAt");
                String urlArticle = (String) article.get("url");
    
                // Aqui você pode salvar no banco, se quiser persistir os dados
                System.out.println("📘 Notícia importada: " + title + " (" + source + ")");
            }
    
        } catch (Exception e) {
            System.err.println("❌ Erro ao buscar notícias: " + e.getMessage());
        }
    }
    

}
