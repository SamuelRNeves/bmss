package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.model.Sentiment;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.repository.SentimentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.InputStream;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class NoticiasService {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private SentimentRepository sentimentRepository;

    private static final Logger log = LoggerFactory.getLogger(NoticiasService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    private static final List<String> BLOCKED_DOMAINS = Arrays.asList(
            "itiny.xyz", "rssing.com", "feedproxy.google",
            "flipboard.com", "biztoc.com", "techspotlight.xyz",
            "news.google.com", "toptechjournal.xyz", "duckduckgo.com"
    );

    // ============================================================
    // 🔹 Busca notícias com cache, GNews principal e fallback RSS
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String cacheKey = keyword.toLowerCase();

        // 🔹 1. Cache local (5 min)
        if (cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log.info("⚡ Retornando notícias do cache para: {}", keyword);
                return entry.data.stream().limit(limit).collect(Collectors.toList());
            }
        }

        // 🔹 2. Tenta GNews primeiro
        List<FeedDTO> noticias = fetchFromGNews(keyword);

        // 🔹 3. Se GNews falhar → usa RSS como fallback
        if (noticias.isEmpty()) {
            log.warn("⚠️ Nenhuma notícia encontrada na GNews. Ativando fallback via RSS...");
            noticias = fetchFromGoogleNewsRSS(keyword);
        }

        // 🔹 4. Armazena no cache
        if (!noticias.isEmpty()) {
            cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        }

        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 Fonte principal: GNews API
    // ============================================================
    private List<FeedDTO> fetchFromGNews(String keyword) {
        String GNEWS_API_KEY = "c413eaed68da399c2ef9fa585fe591aa";
        String query = keyword + " OR bitcoin OR criptomoeda OR economia OR política";
        String url = "https://gnews.io/api/v4/search?q=" + query +
                "&lang=pt&country=br&max=20&apikey=" + GNEWS_API_KEY;

        log.info("🌍 [GNews] Buscando notícias: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);

            // Verifica erros retornados pela API
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
    // 🔹 Fallback via RSS do Google News
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
    // 🔹 Chamada ao Flask (análise em lote)
    // ============================================================
   public List<Map<String, Object>> analyzeBatch(List<String> textos) {
    if (textos == null || textos.isEmpty()) {
        log.warn("⚠️ Nenhum texto enviado para o Flask.");
        return Collections.emptyList();
    }

    String flaskUrl = "http://192.168.253.92:5000/analyze-batch";

    try {
        // 🔧 Configura o RestTemplate com timeout e logging detalhado
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(8000);
        RestTemplate restTemplate = new RestTemplate(factory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        log.info("📦 Enviando {} textos para Flask em {}", textos.size(), flaskUrl);

        HttpEntity<List<String>> request = new HttpEntity<>(textos, headers);

        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                flaskUrl,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
        );

        log.info("📩 Código HTTP do Flask: {}", response.getStatusCode());
        log.info("📩 Corpo do Flask: {}", response.getBody());

        if (response.getStatusCode() != HttpStatus.OK) {
            log.error("❌ Flask retornou status {}", response.getStatusCode());
            return Collections.emptyList();
        }

        List<Map<String, Object>> body = response.getBody();
        if (body == null || body.isEmpty()) {
            log.warn("⚠️ Flask respondeu corpo vazio.");
            return Collections.emptyList();
        }

        log.info("✅ Recebido {} análises do Flask.", body.size());
        return body;

    } catch (Exception e) {
        log.error("❌ Falha ao contatar Flask em {}: {}", flaskUrl, e.getMessage(), e);
        e.printStackTrace();
        return Collections.emptyList();
    }
}



    // ============================================================
    // 🔹 Busca, análise e persistência no banco
    // ============================================================
    public void fetchAndStoreNews(String keyword) {
    List<FeedDTO> noticias = buscarNoticias(20, keyword);
    if (noticias == null || noticias.isEmpty()) {
        System.out.println("⚠️ Nenhuma notícia para importar.");
        return;
    }

    // 🔹 Junta título + descrição para enviar ao Flask
    List<String> textos = noticias.stream()
            .map(n -> (Optional.ofNullable(n.getTitle()).orElse("")) + ". " +
                      (Optional.ofNullable(n.getDescription()).orElse("")))
            .collect(Collectors.toList());

    // 🔹 Chama o Flask
    List<Map<String, Object>> analises = analyzeBatch(textos);

    if (analises == null || analises.isEmpty()) {
        System.out.println("⚠️ Nenhuma análise recebida do Flask. Mantendo sentimento neutro.");
    } else {
        System.out.println("✅ Flask retornou " + analises.size() + " análises válidas!");
    }

    // 🔹 Salva notícia por notícia
    for (int i = 0; i < noticias.size(); i++) {
        FeedDTO dto = noticias.get(i);

        String label = "neutral";
        double score = 0.0;

        if (analises != null && i < analises.size() && analises.get(i) != null) {
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

        // 🔹 Evita duplicatas no banco (URL)
        if (itemRepository.existsByUrl(dto.getUrl())) {
            System.out.println("⏩ Pulando notícia já existente: " + dto.getUrl());
            continue;
        }

        // 🔹 Salva o Item
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

        // 🔹 Salva o Sentimento vinculado
        Sentiment sentiment = Sentiment.builder()
                .item(item)
                .label(label)
                .score(score)
                .model("Adilmar/caramelo-smile-2")
                .createdAt(LocalDateTime.now())
                .build();
        sentimentRepository.save(sentiment);

        System.out.println("💾 Salvo: " + label.toUpperCase() + " (" + score + ") → " + dto.getTitle());
    }

    System.out.println("🏁 " + noticias.size() + " notícias analisadas e persistidas com sucesso!");
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
