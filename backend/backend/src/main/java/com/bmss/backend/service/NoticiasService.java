package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NoticiasService {

    @Autowired
    private ItemRepository itemRepository;

    private final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private final String NEWS_API_URL = "https://newsapi.org/v2/everything";
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    // ============================================================
    // 🔹 Busca notícias para o controller (com cache + fallback)
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String cacheKey = keyword.toLowerCase();

        CacheEntry cacheEntry = cache.get(cacheKey);
        if (cacheEntry != null && System.currentTimeMillis() - cacheEntry.timestamp < CACHE_DURATION_MS) {
            System.out.println("⚡ Retornando notícias do cache para: " + keyword);
            return cacheEntry.data.stream().limit(limit).map(this::copyDto).collect(Collectors.toList());
        }

        List<FeedDTO> noticias;
        try {
            noticias = Optional.ofNullable(fetchNewsFromApi(keyword)).orElse(Collections.emptyList());
        } catch (Exception e) {
            System.err.println("❌ Erro ao acessar a API NewsAPI: " + e.getMessage());
            noticias = Collections.emptyList();
        }

        if (noticias.isEmpty()) {
            System.out.println("⚠️ Usando fallback local de notícias.");
            noticias = getFallbackNoticias();
        } else {
            enrichWithSentiment(noticias);
        }

        List<FeedDTO> cachedCopy = noticias.stream().map(this::copyDto).collect(Collectors.toList());
        cache.put(cacheKey, new CacheEntry(cachedCopy, System.currentTimeMillis()));
        return cachedCopy.stream().limit(limit).map(this::copyDto).collect(Collectors.toList());
    }
    

    // ============================================================
    // 🔹 Busca notícias reais na NewsAPI
    // ============================================================
    private List<FeedDTO> fetchNewsFromApi(String keyword) {
        String query = keyword + " OR bitcoin OR criptomoeda OR mercado financeiro";

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(NEWS_API_URL)
                .queryParam("q", query)
                .queryParam("language", "pt")
                .queryParam("sortBy", "publishedAt")
                .queryParam("pageSize", 12)
                .queryParam("apiKey", NEWS_API_KEY);

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36");
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        ResponseEntity<Map> response = restTemplate.exchange(
                builder.toUriString(),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class
        );

        if (response.getBody() == null || response.getBody().get("articles") == null)
            return Collections.emptyList();

        List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");
        if (articles == null) {
            return Collections.emptyList();
        }

        Map<String, FeedDTO> deduplicated = new LinkedHashMap<>();

        for (Map<String, Object> article : articles) {
            String title = trimToNull((String) article.get("title"));
            String description = trimToNull((String) article.get("description"));

            if (title == null && description == null) {
                continue;
            }

            String rawUrl = article.get("url") != null ? article.get("url").toString() : null;
            String normalizedUrl = normalizeUrl(rawUrl);

            FeedDTO dto = new FeedDTO();
            dto.setTitle(title);
            dto.setDescription(description);
            dto.setUrl(normalizedUrl);

            Map<String, Object> src = (Map<String, Object>) article.get("source");
            dto.setSource(src != null ? trimToNull((String) src.get("name")) : "Desconhecida");

            dto.setPublishedAt((String) article.get("publishedAt"));
            dto.setSentimento("neutral");
            dto.setScore(0.0);

            String dedupKey = normalizedUrl != null ? normalizedUrl : (title != null ? title : UUID.randomUUID().toString());
            deduplicated.putIfAbsent(dedupKey, dto);
        }

        return new ArrayList<>(deduplicated.values());
    }

    // ============================================================
    // 🔹 Fallback local (3 notícias de exemplo)
    // ============================================================
    private List<FeedDTO> getFallbackNoticias() {
        List<FeedDTO> list = new ArrayList<>();
        list.add(new FeedDTO(
                "Bitcoin rompe resistência dos 70 mil dólares",
                "Investidores voltam a apostar em alta após semana de estabilidade.",
                "https://exemplo1.com", "CoinDesk",
                "2025-10-21T12:30:00Z", "positive", 0.9
        ));
        list.add(new FeedDTO(
                "ETF de Bitcoin atrai fluxo recorde em outubro",
                "Fundos institucionais voltam a registrar forte entrada de capital.",
                "https://exemplo2.com", "Bloomberg",
                "2025-10-20T18:00:00Z", "neutral", 0.1
        ));
        list.add(new FeedDTO(
                "Mercado prevê corte de juros e impacto no BTC",
                "Expectativas de política monetária voltam a favorecer criptoativos.",
                "https://exemplo3.com", "Reuters",
                "2025-10-19T15:45:00Z", "positive", 0.8
        ));
        return list;
    }

    // ============================================================
    // 🔹 Envia textos para o Flask (melhora precisão)
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
            System.err.println("❌ Erro ao enviar para Flask: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    // ============================================================
    // 🔹 Fetch + análise + persistência (para botão “Analisar últimas”)
    // ============================================================
    public void fetchAndStoreNews(String keyword) {
        List<FeedDTO> noticias = buscarNoticias(10, keyword);
        if (noticias.isEmpty()) return;

        for (FeedDTO dto : noticias) {
            Item item = new Item();
            item.setTitle(dto.getTitle());
            item.setText(Optional.ofNullable(dto.getDescription()).orElse(dto.getTitle()));
            item.setUrl(dto.getUrl());
            item.setSourceName(dto.getSource());
            item.setPublishedAt(parsePublishedAt(dto.getPublishedAt()));
            item.setSentimentLabel(dto.getSentimento());
            item.setSentimentScore(dto.getScore());
            item.setAnalyzedAt(LocalDateTime.now());
            itemRepository.save(item);
        }

        System.out.println("✅ Notícias importadas e analisadas com sucesso!");
    }

    private FeedDTO copyDto(FeedDTO original) {
        FeedDTO copy = new FeedDTO();
        copy.setTitle(original.getTitle());
        copy.setDescription(original.getDescription());
        copy.setUrl(original.getUrl());
        copy.setSource(original.getSource());
        copy.setPublishedAt(original.getPublishedAt());
        copy.setSentimento(original.getSentimento());
        copy.setScore(original.getScore());
        return copy;
    }

    private void enrichWithSentiment(List<FeedDTO> noticias) {
        List<Integer> indexMap = new ArrayList<>();
        List<String> textos = new ArrayList<>();

        for (int i = 0; i < noticias.size(); i++) {
            FeedDTO dto = noticias.get(i);
            String texto = buildSentimentText(dto);
            if (texto.isBlank()) {
                continue;
            }
            indexMap.add(i);
            textos.add(texto);
        }

        if (textos.isEmpty()) {
            return;
        }

        List<Map<String, Object>> analises = analyzeBatch(textos);
        if (analises.isEmpty()) {
            return;
        }

        for (int i = 0; i < analises.size() && i < indexMap.size(); i++) {
            FeedDTO dto = noticias.get(indexMap.get(i));
            Map<String, Object> analise = analises.get(i);
            if (analise == null) {
                continue;
            }

            Object label = analise.get("label");
            if (label instanceof String) {
                dto.setSentimento(((String) label).toLowerCase());
            }

            Object score = analise.get("score");
            if (score != null) {
                try {
                    dto.setScore(Double.parseDouble(score.toString()));
                } catch (NumberFormatException ignored) {
                    dto.setScore(0.0);
                }
            }
        }
    }

    private String buildSentimentText(FeedDTO dto) {
        String title = Optional.ofNullable(dto.getTitle()).orElse("").trim();
        String description = Optional.ofNullable(dto.getDescription()).orElse("").trim();
        String combined = (title + ". " + description).trim();
        return combined.isBlank() ? title : combined;
    }

    private static final Set<String> REDIRECT_PARAM_KEYS = Set.of("u", "url", "r", "target", "link", "newsurl", "newsUrl");

    private String normalizeUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return null;
        }

        String candidate = rawUrl;

        try {
            URI uri = URI.create(rawUrl);
            String host = uri.getHost();
            if (host != null && host.contains("itiny.xyz")) {
                String query = uri.getQuery();
                if (query != null) {
                    for (String param : query.split("&")) {
                        String[] parts = param.split("=", 2);
                        if (parts.length == 2 && REDIRECT_PARAM_KEYS.contains(parts[0].toLowerCase())) {
                            String decoded = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
                            if (!decoded.isBlank()) {
                                candidate = decoded;
                                break;
                            }
                        }
                    }
                }
            }
        } catch (IllegalArgumentException ignored) {
        }

        if (candidate.contains("itiny.xyz") && !candidate.equals(rawUrl)) {
            return normalizeUrl(candidate);
        }

        return stripTrackingParameters(candidate);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String stripTrackingParameters(String url) {
        try {
            URI uri = URI.create(url);
            String query = uri.getQuery();
            if (query == null || query.isBlank()) {
                return url;
            }

            String filtered = Arrays.stream(query.split("&"))
                    .filter(param -> {
                        String lower = param.toLowerCase();
                        return !(lower.startsWith("utm_")
                                || lower.startsWith("ref=")
                                || lower.startsWith("fbclid=")
                                || lower.startsWith("gclid="));
                    })
                    .collect(Collectors.joining("&"));

            if (filtered.equals(query)) {
                return url;
            }

            return new URI(
                    uri.getScheme(),
                    uri.getAuthority(),
                    uri.getPath(),
                    filtered.isBlank() ? null : filtered,
                    uri.getFragment()
            ).toString();
        } catch (Exception ignored) {
            return url;
        }
    }

    private LocalDateTime parsePublishedAt(String publishedAt) {
        if (publishedAt == null || publishedAt.isBlank()) {
            return LocalDateTime.now();
        }

        try {
            return OffsetDateTime.parse(publishedAt).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
        }

        try {
            return LocalDateTime.parse(publishedAt);
        } catch (DateTimeParseException ignored) {
        }

        return LocalDateTime.now();
    }

    public List<Map<String, Object>> calcularTendenciaPorDia(List<FeedDTO> noticias) {
        Map<LocalDate, long[]> agrupado = new LinkedHashMap<>();

        for (FeedDTO dto : noticias) {
            LocalDate dia = parsePublishedAt(dto.getPublishedAt()).toLocalDate();
            long[] contadores = agrupado.computeIfAbsent(dia, d -> new long[]{0, 0, 0});
            String sentimento = Optional.ofNullable(dto.getSentimento()).orElse("neutral").toLowerCase();

            switch (sentimento) {
                case "positive":
                    contadores[0]++;
                    break;
                case "negative":
                    contadores[2]++;
                    break;
                default:
                    contadores[1]++;
                    break;
            }
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

        return agrupado.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, long[]>comparingByKey().reversed())
                .limit(5)
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("day", entry.getKey().format(formatter));
                    map.put("positive", entry.getValue()[0]);
                    map.put("neutral", entry.getValue()[1]);
                    map.put("negative", entry.getValue()[2]);
                    return map;
                })
                .collect(Collectors.toList());
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
