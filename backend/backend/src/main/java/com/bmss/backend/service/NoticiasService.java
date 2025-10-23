package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NoticiasService {

    @Autowired
    private ItemRepository itemRepository;

    // 🔹 Chaves de APIs externas (gere as suas em newsapi.org e newsdata.io)
    private final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private final String NEWSDATA_API_KEY = "pub_c7aab104097e47739074cb21bc0eeac9";

    private final String NEWS_API_URL = "https://newsapi.org/v2/everything";
    private final String NEWSDATA_API_URL = "https://newsdata.io/api/1/news";
    private final String RSS_BACKUP_URL = "https://rss.app/feeds/v1.1/bitcoin-news.xml";

    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    // ============================================================
    // 🔹 Busca notícias de múltiplas fontes (com cache e fallback)
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String cacheKey = keyword.toLowerCase();

        // 🔹 1. Verifica cache
        if (cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log("⚡ Retornando do cache para: " + keyword, "cyan");
                return entry.data.stream().limit(limit).collect(Collectors.toList());
            }
        }

        List<FeedDTO> noticias = new ArrayList<>();

        // 🔹 2. NewsAPI
        try {
            List<FeedDTO> fromNewsAPI = fetchFromNewsAPI(keyword);
            noticias.addAll(fromNewsAPI);
            log("📰 NewsAPI retornou " + fromNewsAPI.size() + " notícias.", "green");
        } catch (Exception e) {
            log("❌ Erro na NewsAPI: " + e.getMessage(), "red");
        }

        // 🔹 3. NewsData.io
        if (noticias.size() < 10) {
            try {
                List<FeedDTO> fromNewsData = fetchFromNewsData(keyword);
                noticias.addAll(fromNewsData);
                log("🌎 NewsData.io retornou " + fromNewsData.size() + " notícias.", "green");
            } catch (Exception e) {
                log("❌ Erro na NewsData.io: " + e.getMessage(), "red");
            }
        }

        // 🔹 4. RSS
        if (noticias.size() < 5) {
            try {
                List<FeedDTO> fromRss = fetchFromRss(keyword);
                noticias.addAll(fromRss);
                log("📡 RSS retornou " + fromRss.size() + " notícias.", "yellow");
            } catch (Exception e) {
                log("❌ Erro ao processar RSS: " + e.getMessage(), "red");
            }
        }

        // 🔹 5. Limpeza e fallback final
        noticias = noticias.stream()
                .filter(Objects::nonNull)
                .filter(n -> !isSpamSource(n.getUrl()))
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(() -> new TreeSet<>(Comparator.comparing(FeedDTO::getUrl))),
                        ArrayList::new
                ));

        if (noticias.isEmpty()) {
            log("⚠️ Nenhuma notícia válida — usando fallback local.", "yellow");
            noticias = getFallbackNoticias();
        }

        cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 Busca via NewsAPI (usando header x-api-key)
    // ============================================================
    private List<FeedDTO> fetchFromNewsAPI(String keyword) {
        String query = keyword + " OR bitcoin OR criptomoeda OR economia OR geopolítica OR política OR mercado financeiro OR tecnologia";

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NEWS_API_URL)
                .queryParam("q", query)
                .queryParam("language", "pt")
                .queryParam("sortBy", "publishedAt")
                .queryParam("pageSize", 40);

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", NEWS_API_KEY);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(builder.toUriString(), HttpMethod.GET, entity, Map.class);

        if (response.getBody() == null || response.getBody().get("articles") == null)
            return Collections.emptyList();

        List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");
        return articles.stream().map(this::mapFromNewsApi).filter(Objects::nonNull).toList();
    }

    private FeedDTO mapFromNewsApi(Map<String, Object> a) {
        String title = sanitize((String) a.get("title"));
        String desc = sanitize((String) a.get("description"));
        String url = (String) a.get("url");
        Map<String, Object> src = (Map<String, Object>) a.get("source");
        String sourceName = src != null ? (String) src.get("name") : "Desconhecida";
        if (url == null || url.isBlank()) return null;
        return new FeedDTO(
                (title != null && !title.isBlank()) ? title : "Notícia recente",
                (desc != null && !desc.isBlank()) ? desc : "Resumo indisponível.",
                url, sourceName, (String) a.get("publishedAt"), "neutral", 0.0
        );
    }

    // ============================================================
    // 🔹 Busca via NewsData.io (apikey na URL)
    // ============================================================
    private List<FeedDTO> fetchFromNewsData(String keyword) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NEWSDATA_API_URL)
                .queryParam("apikey", NEWSDATA_API_KEY)
                .queryParam("q", keyword)
                .queryParam("language", "pt")
                .queryParam("category", "business,politics,technology,world")
                .queryParam("page", 1);

        ResponseEntity<Map> response = restTemplate.exchange(builder.toUriString(), HttpMethod.GET, null, Map.class);
        if (response.getBody() == null || response.getBody().get("results") == null)
            return Collections.emptyList();

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("results");
        return results.stream().map(this::mapFromNewsData).filter(Objects::nonNull).toList();
    }

    private FeedDTO mapFromNewsData(Map<String, Object> r) {
        String title = sanitize((String) r.get("title"));
        String desc = sanitize((String) r.get("description"));
        String url = (String) r.get("link");
        String source = (String) r.get("source_id");
        if (url == null || url.isBlank()) return null;
        return new FeedDTO(
                title != null ? title : "Notícia recente",
                desc != null ? desc : "Resumo não disponível.",
                url, source != null ? source : "NewsData.io",
                (String) r.get("pubDate"), "neutral", 0.0
        );
    }

    // ============================================================
    // 🔹 RSS Fallback simples
    // ============================================================
    private List<FeedDTO> fetchFromRss(String keyword) {
        ResponseEntity<String> response = restTemplate.getForEntity(RSS_BACKUP_URL, String.class);
        if (response.getBody() == null) return Collections.emptyList();

        String xml = response.getBody();
        List<FeedDTO> items = new ArrayList<>();
        String[] parts = xml.split("<item>");
        for (String part : parts) {
            if (part.contains("<title>")) {
                String title = part.split("<title>")[1].split("</title>")[0];
                String link = part.contains("<link>") ? part.split("<link>")[1].split("</link>")[0] : "";
                items.add(new FeedDTO(title, "", link, "RSS Feed", LocalDateTime.now().toString(), "neutral", 0.0));
            }
        }
        return items;
    }

    // ============================================================
    // 🔹 Fallback mínimo
    // ============================================================
    private List<FeedDTO> getFallbackNoticias() {
        return List.of(new FeedDTO(
                "Serviço temporário indisponível",
                "Todas as fontes estão fora do ar — tente novamente em alguns minutos.",
                "https://newsapi.org",
                "BMSS Backup",
                LocalDateTime.now().toString(),
                "neutral",
                0.0
        ));
    }

    // ============================================================
    // 🔹 Integração com Flask
    // ============================================================
    public List<Map<String, Object>> analyzeBatch(List<String> textos) {
        try {
            String url = "http://localhost:5000/analyze-batch";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<List<String>> req = new HttpEntity<>(textos, headers);

            ResponseEntity<List> resp = restTemplate.exchange(url, HttpMethod.POST, req, List.class);
            return resp.getBody() != null ? resp.getBody() : Collections.emptyList();
        } catch (Exception e) {
            log("⚠️ Erro ao conectar com Flask: " + e.getMessage(), "red");
            return Collections.emptyList();
        }
    }

    // ============================================================
    // 🔹 Salvamento e análise local
    // ============================================================
    public void fetchAndStoreNews(String keyword) {
        List<FeedDTO> noticias = buscarNoticias(30, keyword);
        if (noticias.isEmpty()) return;

        List<String> textos = noticias.stream()
                .map(n -> n.getTitle() + ". " + n.getDescription())
                .collect(Collectors.toList());

        List<Map<String, Object>> analises = analyzeBatch(textos);

        for (int i = 0; i < noticias.size(); i++) {
            FeedDTO dto = noticias.get(i);
            Item item = new Item();
            item.setText(dto.getDescription());
            item.setUrl(dto.getUrl());
            item.setSourceName(dto.getSource());

            try {
                item.setPublishedAt(LocalDateTime.parse(dto.getPublishedAt().replace("Z", "")));
            } catch (Exception e) {
                item.setPublishedAt(LocalDateTime.now());
            }

            if (i < analises.size()) {
                Map<String, Object> a = analises.get(i);
                item.setSentimentLabel((String) a.getOrDefault("label", "neutral"));
                item.setSentimentScore(Double.valueOf(a.getOrDefault("score", 0.0).toString()));
            }

            item.setAnalyzedAt(LocalDateTime.now());
            itemRepository.save(item);
        }

        log("✅ Notícias importadas e analisadas com sucesso!", "green");
    }

    // ============================================================
    // 🔹 Auxiliares
    // ============================================================
    private boolean isSpamSource(String url) {
        if (url == null) return true;
        return url.contains("itiny.xyz") || url.contains("rssing") ||
               url.contains("feedproxy") || url.contains("news.google") ||
               url.contains("yandex") || url.contains("cryptonews");
    }

    private String sanitize(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]*>", "")
                .replaceAll("&[^;]+;", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private void log(String message, String color) {
        String colorCode = switch (color) {
            case "red" -> "\u001B[31m";
            case "green" -> "\u001B[32m";
            case "yellow" -> "\u001B[33m";
            case "cyan" -> "\u001B[36m";
            default -> "\u001B[0m";
        };
        System.out.println(colorCode + message + "\u001B[0m");
    }

    private static class CacheEntry {
        List<FeedDTO> data;
        long timestamp;
        CacheEntry(List<FeedDTO> data, long timestamp) {
            this.data = data;
            this.timestamp = timestamp;
        }
    }
}
