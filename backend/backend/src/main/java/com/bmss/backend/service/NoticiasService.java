package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.exception.SentimentAnalysisException;
import com.bmss.backend.model.Item;
import com.bmss.backend.model.Sentiment;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.repository.SentimentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NoticiasService {

    private final ItemRepository itemRepository;
    private final SentimentRepository sentimentRepository;
    private final RestTemplate newsRestTemplate;
    private final RestTemplate flaskRestTemplate;
    private final URI flaskEndpoint;

    private static final Logger log = LoggerFactory.getLogger(NoticiasService.class);
    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    public NoticiasService(
            ItemRepository itemRepository,
            SentimentRepository sentimentRepository,
            RestTemplateBuilder restTemplateBuilder,
            @Value("${bmss.sentiment.flask-url:http://localhost:5000/analyze-batch}") String flaskUrl,
            @Value("${bmss.sentiment.connect-timeout:4s}") Duration connectTimeout,
            @Value("${bmss.sentiment.read-timeout:8s}") Duration readTimeout
    ) {
        this.itemRepository = itemRepository;
        this.sentimentRepository = sentimentRepository;
        this.newsRestTemplate = restTemplateBuilder.build();
        this.flaskRestTemplate = restTemplateBuilder
                .setConnectTimeout(connectTimeout)
                .setReadTimeout(readTimeout)
                .build();
        this.flaskEndpoint = URI.create(Objects.requireNonNull(flaskUrl, "Flask URL must not be null"));
    }

    private static final List<String> BLOCKED_DOMAINS = Arrays.asList(
            "itiny.xyz", "rssing.com", "feedproxy.google",
            "flipboard.com", "biztoc.com", "techspotlight.xyz",
            "news.google.com", "toptechjournal.xyz", "duckduckgo.com"
    );

    // ============================================================
    // 🔹 Busca notícias (GNews → fallback RSS)
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String cacheKey = keyword.toLowerCase();

        // 🔹 Cache local (5 min)
        if (cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log.info("⚡ Retornando notícias do cache para: {}", keyword);
                return entry.data.stream().limit(limit).collect(Collectors.toList());
            }
        }

        List<FeedDTO> noticias = fetchFromGNews(keyword);

        if (noticias.isEmpty()) {
            log.warn("⚠️ Nenhuma notícia encontrada na GNews. Ativando fallback via RSS...");
            noticias = fetchFromGoogleNewsRSS(keyword);
        }

        if (!noticias.isEmpty()) {
            cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        }

        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 GNews API
    // ============================================================
    private List<FeedDTO> fetchFromGNews(String keyword) {
        String GNEWS_API_KEY = "c413eaed68da399c2ef9fa585fe591aa";
        String query = "(\"" + keyword + "\" OR bitcoin OR BTC) " +
                   "(preço OR valor OR mercado OR alta OR baixa OR queda OR sobe OR desce " +
                   "OR investimento OR trading OR análise técnica OR fundos OR ETF " +
                   "OR halving OR mineração OR blockchain OR criptomoeda OR cripto) " +
                   "-(jogo OR game OR meme OR piada OR entretenimento)";
                   
        String url = "https://gnews.io/api/v4/search?q=" + query +
                "&lang=pt&country=br&max=20&apikey=" + GNEWS_API_KEY;

        log.info("🌍 [GNews] Buscando notícias: {}", url);

        try {
            ResponseEntity<Map> response = newsRestTemplate.exchange(url, HttpMethod.GET, null, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("errors")) {
                log.warn("⚠️ Erro GNews: {}", response.getBody().get("errors"));
                return Collections.emptyList();
            }

            if (response.getBody() == null || response.getBody().get("articles") == null) {
                log.warn("⚠️ Nenhum artigo retornado pela GNews.");
                return Collections.emptyList();
            }

            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");

            return articles.stream()
                    .filter(a -> a.get("title") != null && a.get("url") != null)
                    .map(a -> {
                        FeedDTO dto = new FeedDTO();
                        dto.setTitle((String) a.get("title"));
                        dto.setDescription((String) a.getOrDefault("description", "Sem descrição"));
                        dto.setUrl((String) a.get("url"));
                        dto.setSource((String) ((Map<String, Object>) a.get("source")).getOrDefault("name", "Desconhecida"));
                        dto.setPublishedAt((String) a.getOrDefault("publishedAt", LocalDateTime.now().toString()));
                        dto.setSentimento("neutral");
                        dto.setScore(0.0);
                        return dto;
                    })
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ Erro ao acessar GNews: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ============================================================
    // 🔹 RSS Fallback
    // ============================================================
    private List<FeedDTO> fetchFromGoogleNewsRSS(String keyword) {
        List<FeedDTO> list = new ArrayList<>();
        try {
            String rssUrl = "https://news.google.com/rss/search?q=" + keyword +
                    "+bitcoin+mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt-419";
            URL url = new URL(rssUrl);
            InputStream stream = url.openStream();
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            Document doc = builder.parse(stream);
            NodeList items = doc.getElementsByTagName("item");

            for (int i = 0; i < items.getLength() && i < 20; i++) {
                Element el = (Element) items.item(i);
                String title = el.getElementsByTagName("title").item(0).getTextContent();
                String link = el.getElementsByTagName("link").item(0).getTextContent();
                if (isBlockedDomain(link)) continue;

                list.add(new FeedDTO(title, "", link, "Google News", LocalDateTime.now().toString(), "neutral", 0.0));
            }

            log.info("🪶 Fallback RSS retornou {} notícias.", list.size());
        } catch (Exception e) {
            log.error("❌ Erro no fallback RSS: {}", e.getMessage());
        }
        return list;
    }

    private boolean isBlockedDomain(String url) {
        return BLOCKED_DOMAINS.stream().anyMatch(url::contains);
    }

    // ============================================================
    // 🔹 Chamada ao Flask (microserviço de sentimento)
    // ============================================================
    public List<Map<String, Object>> analyzeBatch(List<String> textos) {
        if (textos == null || textos.isEmpty()) {
            log.warn("⚠️ Nenhum texto enviado para o Flask.");
            return Collections.emptyList();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        log.info("📦 Enviando {} textos para Flask em {}", textos.size(), flaskEndpoint);

        HttpEntity<List<String>> request = new HttpEntity<>(textos, headers);

        final ResponseEntity<List<Map<String, Object>>> response;
        try {
            response = flaskRestTemplate.exchange(
                    flaskEndpoint,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
        } catch (RestClientException ex) {
            throw new SentimentAnalysisException(
                    "Falha ao contatar Flask em " + flaskEndpoint + ": " + ex.getMessage(),
                    ex
            );
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new SentimentAnalysisException("Flask retornou status " + response.getStatusCode());
        }

        List<Map<String, Object>> body = response.getBody();
        if (body == null || body.isEmpty()) {
            throw new SentimentAnalysisException("Flask respondeu corpo vazio.");
        }

        log.info("✅ Recebido {} análises do Flask.", body.size());
        return body;
    }

    // ============================================================
    // 🔹 Busca, análise e persistência
    // ============================================================
    public void fetchAndStoreNews(String keyword) {
        List<FeedDTO> noticias = buscarNoticias(20, keyword);
        if (noticias == null || noticias.isEmpty()) {
            log.warn("⚠️ Nenhuma notícia para importar.");
            return;
        }

        List<String> textos = noticias.stream()
                .map(n -> (Optional.ofNullable(n.getTitle()).orElse("")) + ". " +
                        (Optional.ofNullable(n.getDescription()).orElse("")))
                .collect(Collectors.toList());

        List<Map<String, Object>> analises = analyzeBatch(textos);

        if (analises.isEmpty()) {
            log.warn("⚠️ Nenhuma análise recebida do Flask. Mantendo sentimento neutro.");
        } else {
            log.info("✅ Flask retornou {} análises válidas!", analises.size());
        }

        for (int i = 0; i < noticias.size(); i++) {
            FeedDTO dto = noticias.get(i);

            String label = "neutral";
            double score = 0.0;

            if (i < analises.size() && analises.get(i) != null) {
                Map<String, Object> analise = analises.get(i);
                Object lbl = analise.get("label");
                Object scr = analise.get("score");

                if (lbl != null) label = lbl.toString().toLowerCase();
                if (scr != null) {
                    try {
                        score = Double.parseDouble(scr.toString());
                    } catch (NumberFormatException ignored) {}
                }
            }

            dto.setSentimento(label);
            dto.setScore(score);

            if (itemRepository.existsByUrl(dto.getUrl())) {
                log.info("⏩ Pulando notícia já existente: {}", dto.getUrl());
                continue;
            }

            Item item = new Item();
            item.setTitle(dto.getTitle());
            item.setText(dto.getDescription());
            item.setUrl(dto.getUrl());
            item.setSourceName(dto.getSource());
            item.setSentimentLabel(label);
            item.setSentimentScore(score);
            item.setPublishedAt(LocalDateTime.now());
            item.setAnalyzedAt(LocalDateTime.now());
            itemRepository.save(item);

            Sentiment sentiment = Sentiment.builder()
                    .item(item)
                    .label(label)
                    .score(score)
                    .model("Adilmar/caramelo-smile-2")
                    .createdAt(LocalDateTime.now())
                    .build();
            sentimentRepository.save(sentiment);

            log.info("💾 Salvo: {} ({}) → {}", label.toUpperCase(), score, dto.getTitle());
        }

        log.info("🏁 {} notícias analisadas e persistidas com sucesso!", noticias.size());
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
