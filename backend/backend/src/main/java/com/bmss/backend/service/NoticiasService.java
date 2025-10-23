package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.dto.NoticiasResponseDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import java.io.StringReader;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NoticiasService {

    private final ItemRepository itemRepository;
    private final RestTemplate restTemplate;
    private final String newsApiKey;
    private final String newsDataApiKey;
    private final String rssBackupUrl;

    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    public NoticiasService(ItemRepository itemRepository,
                           RestTemplateBuilder restTemplateBuilder,
                           @Value("${newsapi.apiKey:}") String newsApiKey,
                           @Value("${newsdata.apiKey:}") String newsDataApiKey,
                           @Value("${news.rss.backup-url:https://rss.app/feeds/v1.1/bitcoin-news.xml}") String rssBackupUrl) {
        this.itemRepository = itemRepository;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(5))
                .build();
        this.newsApiKey = newsApiKey;
        this.newsDataApiKey = newsDataApiKey;
        this.rssBackupUrl = rssBackupUrl;
    }

    // ============================================================
    // 🔹 Busca notícias de múltiplas fontes (com cache e fallback)
    // ============================================================
    public NoticiasResponseDTO buscarNoticias(int limit, String keyword) {
        String normalizedKeyword = (keyword == null || keyword.isBlank())
                ? "bitcoin"
                : keyword.trim().toLowerCase(Locale.ROOT);
        int safeLimit = limit > 0 ? Math.min(limit, 50) : 12;

        if (cache.containsKey(normalizedKeyword)) {
            CacheEntry entry = cache.get(normalizedKeyword);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log("⚡ Retornando do cache para: " + normalizedKeyword, "cyan");
                return buildResponse(entry.data, safeLimit, true, entry.fallbackUsed,
                        entry.fallbackSource, entry.warnings, entry.errors, entry.partial, entry.message);
            }
        }

        List<FeedDTO> noticias = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        boolean fallbackUsed = false;
        String fallbackSource = null;

        if (!StringUtils.hasText(newsApiKey)) {
            warnings.add("NewsAPI: chave de API não configurada. Defina NEWS_API_KEY para habilitar a fonte.");
        } else {
            try {
                List<FeedDTO> fromNewsAPI = fetchFromNewsAPI(normalizedKeyword);
                noticias.addAll(fromNewsAPI);
                log("📰 NewsAPI retornou " + fromNewsAPI.size() + " notícias.", "green");
            } catch (HttpStatusCodeException ex) {
                String msg = "NewsAPI: " + ex.getStatusCode().value() + " - " + ex.getStatusText();
                if (ex.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                    msg += " (verifique a chave de API)";
                }
                errors.add(msg);
                log("❌ Erro na NewsAPI: " + ex.getMessage(), "red");
            } catch (Exception ex) {
                errors.add("NewsAPI: " + ex.getMessage());
                log("❌ Erro na NewsAPI: " + ex.getMessage(), "red");
            }
        }

        if (noticias.size() < 10) {
            if (!StringUtils.hasText(newsDataApiKey)) {
                warnings.add("NewsData.io: chave de API não configurada. Defina NEWSDATA_API_KEY para habilitar a fonte.");
            } else {
                try {
                    List<FeedDTO> fromNewsData = fetchFromNewsData(normalizedKeyword);
                    noticias.addAll(fromNewsData);
                    log("🌎 NewsData.io retornou " + fromNewsData.size() + " notícias.", "green");
                } catch (HttpStatusCodeException ex) {
                    String msg = "NewsData.io: " + ex.getStatusCode().value() + " - " + ex.getStatusText();
                    if (ex.getStatusCode().value() == HttpStatus.UNAUTHORIZED.value()) {
                        msg += " (verifique a chave de API)";
                    }
                    errors.add(msg);
                    log("❌ Erro na NewsData.io: " + ex.getMessage(), "red");
                } catch (Exception ex) {
                    errors.add("NewsData.io: " + ex.getMessage());
                    log("❌ Erro na NewsData.io: " + ex.getMessage(), "red");
                }
            }
        }

        if (noticias.size() < 5) {
            try {
                List<FeedDTO> fromRss = fetchFromRss(normalizedKeyword);
                noticias.addAll(fromRss);
                if (!fromRss.isEmpty()) {
                    log("📡 RSS retornou " + fromRss.size() + " notícias.", "yellow");
                }
            } catch (Exception ex) {
                errors.add("RSS: " + ex.getMessage());
                log("❌ Erro ao processar RSS: " + ex.getMessage(), "red");
            }
        }

        noticias = deduplicate(noticias);

        if (noticias.isEmpty()) {
            List<FeedDTO> stored = getStoredNoticias(safeLimit);
            if (!stored.isEmpty()) {
                fallbackUsed = true;
                fallbackSource = "database";
                noticias.addAll(stored);
                log("⚠️ Usando fallback com notícias armazenadas localmente.", "yellow");
            }
        }

        if (noticias.isEmpty()) {
            fallbackUsed = true;
            fallbackSource = "static";
            warnings.add("Todas as fontes externas falharam. Exibindo aviso temporário.");
            noticias = getFallbackNoticias();
            log("⚠️ Nenhuma notícia válida — usando fallback estático.", "yellow");
        }

        boolean partial = !errors.isEmpty() || (!warnings.isEmpty() && !noticias.isEmpty());
        String message = buildMessage(fallbackUsed, fallbackSource, partial);

        NoticiasResponseDTO response = buildResponse(noticias, safeLimit, false, fallbackUsed,
                fallbackSource, warnings, errors, partial, message);

        boolean shouldCache = !noticias.isEmpty() && (!fallbackUsed || !"static".equals(fallbackSource));
        if (shouldCache) {
            cache.put(normalizedKeyword, new CacheEntry(
                    new ArrayList<>(noticias),
                    fallbackUsed,
                    fallbackSource,
                    new ArrayList<>(warnings),
                    new ArrayList<>(errors),
                    partial,
                    message,
                    System.currentTimeMillis()
            ));
        }

        return response;
    }

    private NoticiasResponseDTO buildResponse(List<FeedDTO> noticias,
                                              int limit,
                                              boolean fromCache,
                                              boolean fallbackUsed,
                                              String fallbackSource,
                                              List<String> warnings,
                                              List<String> errors,
                                              boolean partial,
                                              String message) {
        NoticiasResponseDTO response = new NoticiasResponseDTO();
        response.setItems(noticias.stream().limit(limit).collect(Collectors.toList()));
        response.setFromCache(fromCache);
        response.setUsingFallback(fallbackUsed);
        response.setFallbackSource(fallbackSource);
        response.setPartial(partial);
        response.setMessage(message);
        response.setWarnings(new ArrayList<>(warnings));
        response.setErrors(new ArrayList<>(errors));
        return response;
    }

    private String buildMessage(boolean fallbackUsed, String fallbackSource, boolean partial) {
        if (fallbackUsed) {
            if ("database".equals(fallbackSource)) {
                return "Mostrando notícias em cache enquanto as fontes externas estão indisponíveis.";
            }
            if ("static".equals(fallbackSource)) {
                return "Nenhuma fonte externa respondeu. Avisaremos assim que os serviços forem restabelecidos.";
            }
            return "Exibindo fallback alternativo.";
        }
        if (partial) {
            return "Algumas fontes não responderam. Exibindo resultados parciais.";
        }
        return null;
    }

    // ============================================================
    // 🔹 Busca via NewsAPI (usando header x-api-key)
    // ============================================================
    private List<FeedDTO> fetchFromNewsAPI(String keyword) {
        String query = keyword + " OR bitcoin OR criptomoeda OR economia OR geopolítica OR política OR mercado financeiro OR tecnologia";

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("https://newsapi.org/v2/everything")
                .queryParam("q", query)
                .queryParam("language", "pt")
                .queryParam("sortBy", "publishedAt")
                .queryParam("pageSize", 40);

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-api-key", newsApiKey);
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
                (StringUtils.hasText(title)) ? title : "Notícia recente",
                (StringUtils.hasText(desc)) ? desc : "Resumo indisponível.",
                url, sourceName, (String) a.get("publishedAt"), "neutral", 0.0
        );
    }

    // ============================================================
    // 🔹 Busca via NewsData.io (apikey na URL)
    // ============================================================
    private List<FeedDTO> fetchFromNewsData(String keyword) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl("https://newsdata.io/api/1/news")
                .queryParam("apikey", newsDataApiKey)
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
                StringUtils.hasText(title) ? title : "Notícia recente",
                StringUtils.hasText(desc) ? desc : "Resumo não disponível.",
                url, source != null ? source : "NewsData.io",
                (String) r.get("pubDate"), "neutral", 0.0
        );
    }

    // ============================================================
    // 🔹 RSS Fallback com filtro de palavras-chave
    // ============================================================
    private List<FeedDTO> fetchFromRss(String keyword) throws Exception {
        ResponseEntity<String> response = restTemplate.getForEntity(rssBackupUrl, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return Collections.emptyList();
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new InputSource(new StringReader(response.getBody())));

        NodeList nodes = doc.getElementsByTagName("item");
        List<FeedDTO> allItems = new ArrayList<>();
        List<FeedDTO> keywordMatches = new ArrayList<>();
        String lowerKeyword = keyword != null ? keyword.toLowerCase(Locale.ROOT) : "";

        for (int i = 0; i < nodes.getLength(); i++) {
            Element element = (Element) nodes.item(i);
            String title = getElementText(element, "title");
            String description = getElementText(element, "description");
            String link = getElementText(element, "link");

            FeedDTO dto = new FeedDTO(
                    StringUtils.hasText(title) ? sanitize(title) : "Notícia recente",
                    sanitize(description),
                    link,
                    "RSS Feed",
                    LocalDateTime.now().toString(),
                    "neutral",
                    0.0
            );

            allItems.add(dto);
            if (StringUtils.hasText(lowerKeyword)) {
                String lowerTitle = title != null ? title.toLowerCase(Locale.ROOT) : "";
                String lowerDescription = description != null ? description.toLowerCase(Locale.ROOT) : "";
                if (lowerTitle.contains(lowerKeyword) || lowerDescription.contains(lowerKeyword)) {
                    keywordMatches.add(dto);
                }
            }
        }

        return keywordMatches.isEmpty() ? allItems : keywordMatches;
    }

    private String getElementText(Element element, String tagName) {
        NodeList list = element.getElementsByTagName(tagName);
        if (list.getLength() == 0 || list.item(0) == null) {
            return "";
        }
        return list.item(0).getTextContent();
    }

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

    private List<FeedDTO> getStoredNoticias(int limit) {
        try {
            List<FeedDTO> stored = itemRepository.findAllByOrderByPublishedAtDesc(PageRequest.of(0, Math.max(limit, 5)))
                    .stream()
                    .map(this::mapFromItem)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());

            if (stored.isEmpty()) {
                stored = itemRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, Math.max(limit, 5)))
                        .stream()
                        .map(this::mapFromItem)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
            }

            return stored;
        } catch (Exception ex) {
            log("⚠️ Erro ao recuperar notícias armazenadas: " + ex.getMessage(), "red");
            return Collections.emptyList();
        }
    }

    private FeedDTO mapFromItem(Item item) {
        if (item == null) {
            return null;
        }
        String title = sanitize(item.getTitle());
        String description = sanitize(item.getText());
        String source = StringUtils.hasText(item.getSourceName()) ? item.getSourceName() : "BMSS";
        LocalDateTime publishedAt = item.getPublishedAt() != null ? item.getPublishedAt() : item.getCreatedAt();
        String sentimento = StringUtils.hasText(item.getSentimentLabel()) ? item.getSentimentLabel() : "neutral";
        Double score = item.getSentimentScore() != null ? item.getSentimentScore() : 0.0;

        return new FeedDTO(
                StringUtils.hasText(title) ? title : "Notícia recente",
                StringUtils.hasText(description) ? description : "Resumo indisponível.",
                item.getUrl(),
                source,
                publishedAt != null ? publishedAt.toString() : LocalDateTime.now().toString(),
                sentimento,
                score
        );
    }

    private List<FeedDTO> deduplicate(List<FeedDTO> noticias) {
        return noticias.stream()
                .filter(Objects::nonNull)
                .filter(n -> !isSpamSource(n.getUrl()))
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(() -> new TreeSet<>(Comparator.comparing(FeedDTO::getUrl))),
                        ArrayList::new
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
        NoticiasResponseDTO response = buscarNoticias(30, keyword);
        List<FeedDTO> noticias = response.getItems();
        if (noticias.isEmpty()) return;

        List<String> textos = noticias.stream()
                .map(n -> n.getTitle() + ". " + n.getDescription())
                .collect(Collectors.toList());

        List<Map<String, Object>> analises = analyzeBatch(textos);

        for (int i = 0; i < noticias.size(); i++) {
            FeedDTO dto = noticias.get(i);
            Item item = new Item();
            item.setTitle(dto.getTitle());
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
        boolean fallbackUsed;
        String fallbackSource;
        List<String> warnings;
        List<String> errors;
        boolean partial;
        String message;
        long timestamp;

        CacheEntry(List<FeedDTO> data,
                   boolean fallbackUsed,
                   String fallbackSource,
                   List<String> warnings,
                   List<String> errors,
                   boolean partial,
                   String message,
                   long timestamp) {
            this.data = data;
            this.fallbackUsed = fallbackUsed;
            this.fallbackSource = fallbackSource;
            this.warnings = warnings;
            this.errors = errors;
            this.partial = partial;
            this.message = message;
            this.timestamp = timestamp;
        }
    }
}
