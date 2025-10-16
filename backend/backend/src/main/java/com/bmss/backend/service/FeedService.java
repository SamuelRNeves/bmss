package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import lombok.Data;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedService {

    private static final String API_KEY = "2397c71979b14eaea433a03179807359";
    private static final String URL =
        "https://newsapi.org/v2/everything?q=bitcoin&language=pt&sortBy=publishedAt&pageSize=10&apiKey=" + API_KEY;

    public List<FeedDTO> fetchNews() {
        RestTemplate restTemplate = new RestTemplate();
        NewsApiResponse response = restTemplate.getForObject(URL, NewsApiResponse.class);

        if (response != null && response.getArticles() != null) {
            return response.getArticles().stream().map(article -> new FeedDTO(
                article.getTitle(),
                article.getDescription(),
                article.getUrl(),
                article.getSource().getName(),
                article.getPublishedAt()
            )).collect(Collectors.toList());
        }

        return List.of(); // vazio se der erro
    }

    // Classes internas para mapear a resposta JSON da NewsAPI
    @Data
    static class NewsApiResponse {
        private List<Article> articles;
    }

    @Data
    static class Article {
        private String title;
        private String description;
        private String url;
        private String publishedAt;
        private Source source;
    }

    @Data
    static class Source {
        private String name;
    }
}
