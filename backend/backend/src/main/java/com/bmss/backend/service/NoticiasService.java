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
    
        // 🔹 1. Verifica cache
        if (cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                System.out.println("⚡ Retornando notícias do cache para: " + keyword);
                return entry.data.stream().limit(limit).collect(Collectors.toList());
            }
        }
    
        // 🔹 2. Busca da API (com proteção)
        List<FeedDTO> noticias;
        try {
            noticias = Optional.ofNullable(fetchNewsFromApi(keyword))
                               .orElse(Collections.emptyList());
        } catch (Exception e) {
            System.err.println("❌ Erro ao acessar a API NewsAPI: " + e.getMessage());
            noticias = Collections.emptyList();
        }
    
        // 🔹 3. Fallback garantido
        if (noticias.isEmpty()) {
            System.out.println("⚠️ Usando fallback local de notícias.");
            noticias = getFallbackNoticias();
        }
    
        // 🔹 4. Armazena no cache
        cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        return noticias.stream().limit(limit).collect(Collectors.toList());
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

        ResponseEntity<Map> response = restTemplate.exchange(
                builder.toUriString(),
                HttpMethod.GET,
                null,
                Map.class
        );

        if (response.getBody() == null || response.getBody().get("articles") == null)
            return Collections.emptyList();

        List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");

        return articles.stream().map(a -> {
            FeedDTO dto = new FeedDTO();
            dto.setTitle((String) a.get("title"));
            dto.setDescription((String) a.get("description"));
            dto.setUrl((String) a.get("url"));

            Map<String, Object> src = (Map<String, Object>) a.get("source");
            dto.setSource(src != null ? (String) src.get("name") : "Desconhecida");

            dto.setPublishedAt((String) a.get("publishedAt"));
            dto.setSentimento("neutral");
            dto.setScore(0.0);
            return dto;
        }).collect(Collectors.toList());
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
            } else {
                item.setSentimentLabel(dto.getSentimento());
                item.setSentimentScore(dto.getScore());
            }

            item.setAnalyzedAt(LocalDateTime.now());
            itemRepository.save(item);
        }

        System.out.println("✅ Notícias importadas e analisadas com sucesso!");
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
