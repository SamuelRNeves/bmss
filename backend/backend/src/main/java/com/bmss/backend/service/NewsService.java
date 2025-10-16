package com.bmss.backend.service;

import com.bmss.backend.dto.NewsApiResponse;
import com.bmss.backend.dto.Article;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final ItemRepository itemRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${newsapi.apiKey}")
    private String apiKey;

    public void fetchAndStoreNews(String keyword) {
        String url = "https://newsapi.org/v2/everything?q=" + keyword + "&apiKey=" + apiKey;

        NewsApiResponse response = restTemplate.getForObject(url, NewsApiResponse.class);

        if (response != null && "ok".equalsIgnoreCase(response.getStatus())) {
            for (Article article : response.getArticles()) {
                Item item = new Item();
                item.setTitle(article.getTitle());
                item.setText(article.getDescription() != null ? article.getDescription() : "Sem conteúdo disponível");

                item.setUrl(article.getUrl());
                item.setSourceName(article.getSource() != null ? article.getSource().getName() : "Unknown");


                // Converter a data para LocalDateTime se necessário
                try {
                    OffsetDateTime odt = OffsetDateTime.parse(article.getPublishedAt());
                    item.setPublishedAt(odt.toLocalDateTime());
                } catch (Exception e) {
                    item.setPublishedAt(null);
                }

                itemRepository.save(item);
            }
        }
    }
}
