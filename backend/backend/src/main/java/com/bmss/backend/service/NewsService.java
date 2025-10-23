package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NewsService {

    private static final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private static final String NEWS_API_ENDPOINT = "https://newsapi.org/v2/everything";
    private static final String DEFAULT_QUERY = "bitcoin OR \"BTC\" OR criptomoeda";
    private static final int DEFAULT_PAGE_SIZE = 12;
    private static final Duration CACHE_DURATION = Duration.ofMinutes(10);
    private static final List<String> KEYWORDS = List.of("bitcoin", "btc", "criptomoeda", "cripto");
    private static final Set<String> BLOCKED_DOMAINS = Set.of("itiny.xyz", "www.itiny.xyz");

    private static final String SENTIMENT_API_URL = "http://localhost:5000/analyze";
    private static final RestTemplate restTemplate = new RestTemplate();

    private List<FeedDTO> cacheNoticias = new ArrayList<>();
    private LocalDateTime ultimaAtualizacao = null;

    public List<FeedDTO> getLatestNews() {
        if (ultimaAtualizacao != null &&
                Duration.between(ultimaAtualizacao, LocalDateTime.now()).compareTo(CACHE_DURATION) < 0 &&
                !cacheNoticias.isEmpty()) {
            return cacheNoticias;
        }

        return refreshLatestNews();
    }

    public List<FeedDTO> refreshLatestNews() {
        List<FeedDTO> noticiasAtualizadas = fetchNewsFromApi();

        if (!noticiasAtualizadas.isEmpty()) {
            cacheNoticias = noticiasAtualizadas;
            ultimaAtualizacao = LocalDateTime.now();
        }

        return cacheNoticias;
    }

    public List<FeedDTO> reanalyzeCachedNews() {
        if (cacheNoticias.isEmpty()) {
            return refreshLatestNews();
        }

        List<FeedDTO> noticiasReprocessadas = cacheNoticias.stream()
                .map(this::reanalyzeSentiment)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (!noticiasReprocessadas.isEmpty()) {
            cacheNoticias = noticiasReprocessadas;
            ultimaAtualizacao = LocalDateTime.now();
        }

        return cacheNoticias;
    }

    private List<FeedDTO> fetchNewsFromApi() {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(NEWS_API_ENDPOINT)
                    .queryParam("q", DEFAULT_QUERY)
                    .queryParam("language", "pt")
                    .queryParam("sortBy", "publishedAt")
                    .queryParam("pageSize", DEFAULT_PAGE_SIZE)
                    .queryParam("apiKey", NEWS_API_KEY)
                    .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody()
                    .getOrDefault("articles", Collections.emptyList());

            if (articles == null || articles.isEmpty()) {
                return Collections.emptyList();
            }

            Map<String, FeedDTO> noticiasAgrupadas = new LinkedHashMap<>();

            for (Map<String, Object> article : articles) {
                FeedDTO dto = mapArticleToDto(article);

                if (dto != null && dto.getUrl() != null && !dto.getUrl().isBlank()) {
                    noticiasAgrupadas.putIfAbsent(dto.getUrl(), dto);
                }
            }

            return new ArrayList<>(noticiasAgrupadas.values());

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    private FeedDTO mapArticleToDto(Map<String, Object> article) {
        String title = Optional.ofNullable((String) article.get("title")).orElse("");
        String description = Optional.ofNullable((String) article.get("description")).orElse("");
        String url = Optional.ofNullable((String) article.get("url")).orElse("");
        String publishedAt = Optional.ofNullable((String) article.get("publishedAt")).orElse("");
        String sourceName = Optional.ofNullable((Map<String, Object>) article.get("source"))
                .map(source -> (String) source.get("name"))
                .orElse("Desconhecida");

        if (!isRelevantArticle(title, description, url)) {
            return null;
        }

        FeedDTO dto = new FeedDTO();
        dto.setTitle(title);
        dto.setDescription(description);
        dto.setUrl(url);
        dto.setSource(sourceName);
        dto.setPublishedAt(publishedAt);

        analyzeSentiment(dto);

        return dto;
    }

    private boolean isRelevantArticle(String title, String description, String url) {
        String combinedText = (title + " " + description).toLowerCase(Locale.ROOT);
        boolean containsKeyword = KEYWORDS.stream().anyMatch(combinedText::contains);

        if (!containsKeyword) {
            return false;
        }

        String domain = extractDomain(url);
        return domain == null || !BLOCKED_DOMAINS.contains(domain);
    }

    private String extractDomain(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        try {
            URI uri = URI.create(url);
            String host = uri.getHost();

            if (host == null) {
                return null;
            }

            return host.startsWith("www.") ? host.substring(4) : host;
        } catch (Exception e) {
            return null;
        }
    }

    private void analyzeSentiment(FeedDTO dto) {
        Map<String, String> request = new HashMap<>();
        String titulo = Optional.ofNullable(dto.getTitle()).orElse("");
        String descricao = Optional.ofNullable(dto.getDescription()).orElse("");
        request.put("text", (titulo + ". " + descricao).trim());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        try {
            ResponseEntity<Map> sentimentResponse = restTemplate.postForEntity(SENTIMENT_API_URL, entity, Map.class);
            Map<String, Object> result = sentimentResponse.getBody();

            if (result != null) {
                dto.setSentimento((String) result.getOrDefault("label", "neutral"));
                Object scoreObj = result.get("score");
                dto.setScore(scoreObj != null ? Double.parseDouble(scoreObj.toString()) : 0.0);
            } else {
                dto.setSentimento("neutral");
                dto.setScore(0.0);
            }

        } catch (Exception e) {
            dto.setSentimento("neutral");
            dto.setScore(0.0);
        }
    }

    private FeedDTO reanalyzeSentiment(FeedDTO dto) {
        if (dto == null) {
            return null;
        }

        analyzeSentiment(dto);
        return dto;
    }

    public void fetchAndStoreNews(String keyword) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(NEWS_API_ENDPOINT)
                    .queryParam("q", keyword)
                    .queryParam("language", "pt")
                    .queryParam("sortBy", "publishedAt")
                    .queryParam("pageSize", DEFAULT_PAGE_SIZE)
                    .queryParam("apiKey", NEWS_API_KEY)
                    .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody()
                    .getOrDefault("articles", Collections.emptyList());

            for (Map<String, Object> article : articles) {
                FeedDTO dto = mapArticleToDto(article);
                if (dto != null) {
                    System.out.println("📘 Notícia importada: " + dto.getTitle() + " (" + dto.getSource() + ")");
                }
            }

        } catch (Exception e) {
            System.err.println("❌ Erro ao buscar notícias: " + e.getMessage());
        }
    }


}
