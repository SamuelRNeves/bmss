package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.*;

@Service
public class FeedService {

    private static final String NEWS_API_URL =
        "https://newsapi.org/v2/everything?q=bitcoin&language=pt&sortBy=publishedAt&pageSize=5&apiKey=SEU_API_KEY";

    public List<FeedDTO> fetchNews() {
        RestTemplate restTemplate = new RestTemplate();
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
                feedList.add(dto);
            }
            return feedList;
        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }
}
