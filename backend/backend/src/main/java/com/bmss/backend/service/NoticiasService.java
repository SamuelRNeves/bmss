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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
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
    private final URI tweetsFlaskEndpoint;

    private static final Logger log = LoggerFactory.getLogger(NoticiasService.class);
    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;
    
    // Lock para prevenir execuções concorrentes
    private final Object fetchLock = new Object();

    public NoticiasService(
            ItemRepository itemRepository,
            SentimentRepository sentimentRepository,
            RestTemplateBuilder restTemplateBuilder,
            @Value("${bmss.sentiment.flask-url:http://localhost:5000/analyze-batch}") String flaskUrl,
            @Value("${bmss.sentiment.tweets-url:http://localhost:5000/analyze-tweets}") String tweetsFlaskUrl,
            @Value("${bmss.sentiment.connect-timeout:10s}") Duration connectTimeout,
            @Value("${bmss.sentiment.read-timeout:20s}") Duration readTimeout
    ) {
        this.itemRepository = itemRepository;
        this.sentimentRepository = sentimentRepository;
        this.newsRestTemplate = restTemplateBuilder.build();
        this.flaskRestTemplate = restTemplateBuilder
                .setConnectTimeout(connectTimeout)
                .setReadTimeout(readTimeout)
                .build();
        this.flaskEndpoint = URI.create(Objects.requireNonNull(flaskUrl, "Flask URL must not be null"));
        this.tweetsFlaskEndpoint = URI.create(Objects.requireNonNull(tweetsFlaskUrl, "Tweets Flask URL must not be null"));
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

        // Remover duplicatas antes de salvar no cache
        noticias = removeDuplicates(noticias);

        if (!noticias.isEmpty()) {
            cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        }

        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 GNews API - COM FILTRO PÓS-COLETA E PREVENÇÃO DE DUPLICATAS
    // ============================================================
    private List<FeedDTO> fetchFromGNews(String keyword) {
        String GNEWS_API_KEY = "c413eaed68da399c2ef9fa585fe591aa";
        
        // Query simples dentro do limite de 200 caracteres
        String query = "bitcoin OR criptomoeda";
        
        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = "https://gnews.io/api/v4/search?q=" + encodedQuery +
                    "&lang=pt&country=br&max=30&apikey=" + GNEWS_API_KEY;

            log.info("🌍 [GNews] Buscando notícias: {}", url);

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

            // Usar Set para URLs únicas durante o processamento
            Set<String> seenUrls = new HashSet<>();
            
            // Filtrar pós-coleta por relevância e remover duplicatas
            return articles.stream()
                    .filter(a -> a.get("title") != null && a.get("url") != null)
                    .filter(a -> {
                        String urlStr = (String) a.get("url");
                        String normalizedUrl = normalizeUrl(urlStr);
                        return seenUrls.add(normalizedUrl); // Retorna false se já existir
                    })
                    .filter(a -> isRelevantNews((String) a.get("title"), (String) a.get("description"), keyword))
                    .map(a -> {
                        FeedDTO dto = new FeedDTO();
                        dto.setTitle((String) a.get("title"));
                        dto.setDescription((String) a.getOrDefault("description", "Sem descrição"));
                        dto.setUrl((String) a.get("url"));
                        dto.setSource((String) ((Map<String, Object>) a.get("source")).getOrDefault("name", "Desconhecida"));
                        dto.setPublishedAt((String) a.getOrDefault("publishedAt", LocalDateTime.now().toString()));
                        dto.setSentimento("neutral");
                        dto.setScore(0.0);
                        dto.setTweet(false);
                        dto.setTweetUrl(null);
                        return dto;
                    })
                    .limit(20)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ Erro ao acessar GNews: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ============================================================
    // 🔹 Filtro de Relevância
    // ============================================================
    private boolean isRelevantNews(String title, String description, String keyword) {
        if (title == null) return false;
        
        String content = (title + " " + (description != null ? description : "")).toLowerCase();
        
        // Palavras-chave que indicam relevância para Bitcoin
        String[] relevantKeywords = {
            "bitcoin", "btc", "criptomoeda", "cripto",
            "preço", "valor", "mercado", "cotação",
            "alta", "baixa", "queda", "sobe", "desce",
            "investimento", "trading", "halving", "mineração",
            "blockchain", "satosh", "etf", "fundos"
        };
        
        // Contar palavras relevantes
        long relevantWords = Arrays.stream(relevantKeywords)
                .filter(kw -> content.contains(kw))
                .count();
        
        // Considerar relevante se tiver pelo menos 1 palavra-chave
        boolean isRelevant = relevantWords >= 1;
        
        if (!isRelevant) {
            log.debug("📰 Notícia filtrada por irrelevância: {}", title);
        }
        
        return isRelevant;
    }

    // ============================================================
    // 🔹 Remove notícias duplicadas por URL (MAIS ROBUSTO)
    // ============================================================
    private List<FeedDTO> removeDuplicates(List<FeedDTO> noticias) {
        if (noticias == null || noticias.isEmpty()) {
            return noticias;
        }

        // Debug: identificar duplicatas
        debugDuplicates(noticias);

        // Usar LinkedHashMap para manter a ordem
        Map<String, FeedDTO> uniqueNews = new LinkedHashMap<>();
        
        for (FeedDTO noticia : noticias) {
            if (noticia.getUrl() != null && !noticia.getUrl().trim().isEmpty()) {
                String normalizedUrl = normalizeUrl(noticia.getUrl());
                
                // Se já não existe, adiciona
                if (!uniqueNews.containsKey(normalizedUrl)) {
                    uniqueNews.put(normalizedUrl, noticia);
                } else {
                    // Se já existe, verifica se a nova é melhor (tem descrição)
                    FeedDTO existing = uniqueNews.get(normalizedUrl);
                    if ((noticia.getDescription() != null && !noticia.getDescription().isEmpty()) &&
                        (existing.getDescription() == null || existing.getDescription().isEmpty())) {
                        uniqueNews.put(normalizedUrl, noticia);
                    }
                }
            }
        }
        
        int duplicatesRemoved = noticias.size() - uniqueNews.size();
        if (duplicatesRemoved > 0) {
            log.info("🧹 Removidas {} duplicatas, restaram {} notícias únicas", 
                     duplicatesRemoved, uniqueNews.size());
        }
        
        return new ArrayList<>(uniqueNews.values());
    }

    // ============================================================
    // 🔹 Debug: identificar duplicatas
    // ============================================================
    private void debugDuplicates(List<FeedDTO> noticias) {
        Map<String, List<FeedDTO>> urlCounts = new HashMap<>();
        
        for (FeedDTO noticia : noticias) {
            String normalizedUrl = normalizeUrl(noticia.getUrl());
            urlCounts.computeIfAbsent(normalizedUrl, k -> new ArrayList<>()).add(noticia);
        }
        
        urlCounts.entrySet().stream()
            .filter(entry -> entry.getValue().size() > 1)
            .forEach(entry -> {
                log.warn("🚨 URL duplicada: {} ({} vezes)", entry.getKey(), entry.getValue().size());
                entry.getValue().forEach(dto -> 
                    log.warn("   - Titulo: {}", dto.getTitle())
                );
            });
    }

    // ============================================================
    // 🔹 Normaliza URL para comparação (MELHORADO)
    // ============================================================
    private String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return "";
        }
        
        try {
            // Remover parâmetros comuns de tracking e UTM
            String normalized = url.split("\\?")[0] // Remove query parameters
                                  .split("#")[0]    // Remove fragments
                                  .replace("https://", "")
                                  .replace("http://", "")
                                  .replace("www.", "")
                                  .replace("//", "/")
                                  .toLowerCase()
                                  .trim();
            
            // Remover trailing slash
            if (normalized.endsWith("/")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }
            
            return normalized;
        } catch (Exception e) {
            log.warn("⚠️ Erro ao normalizar URL: {}, usando original", url);
            return url.toLowerCase().trim();
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

            // Usar Set para prevenir duplicatas no RSS também
            Set<String> seenUrls = new HashSet<>();
            
            for (int i = 0; i < items.getLength() && i < 20; i++) {
                Element el = (Element) items.item(i);
                String title = el.getElementsByTagName("title").item(0).getTextContent();
                String link = el.getElementsByTagName("link").item(0).getTextContent();
                
                if (isBlockedDomain(link)) continue;
                
                String normalizedUrl = normalizeUrl(link);
                if (!seenUrls.add(normalizedUrl)) {
                    continue; // Pular duplicata
                }

                list.add(new FeedDTO(title, "", link, "Google News", LocalDateTime.now().toString(), "neutral", 0.0, false, null));
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
    // 🔹 Busca, análise e persistência (COM LOCK)
    // ============================================================
    public void fetchAndStoreNews(String keyword) {
        // Prevenir execuções concorrentes que podem causar duplicatas
        synchronized (fetchLock) {
            List<FeedDTO> noticias = buscarNoticias(20, keyword);
            if (noticias == null || noticias.isEmpty()) {
                log.warn("⚠️ Nenhuma notícia para importar.");
                return;
            }

            // Verificação final de duplicatas
            noticias = removeDuplicates(noticias);

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

            int savedCount = 0;
            int skippedCount = 0;
            
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

                // Verificação robusta de duplicatas no banco
                if (itemRepository.existsByUrl(dto.getUrl())) {
                    log.debug("⏩ Pulando notícia já existente: {}", dto.getUrl());
                    skippedCount++;
                    continue;
                }

                try {
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
                            .model("cardiffnlp/twitter-roberta-base-sentiment-latest")
                            .createdAt(LocalDateTime.now())
                            .build();
                    sentimentRepository.save(sentiment);

                    log.info("💾 Salvo: {} ({}) → {}", label.toUpperCase(), score, dto.getTitle());
                    savedCount++;
                    
                } catch (Exception e) {
                    log.error("❌ Erro ao salvar notícia: {}", e.getMessage());
                }
            }

            log.info("🏁 {}/{} notícias analisadas e persistidas com sucesso! ({} puladas)", 
                    savedCount, noticias.size(), skippedCount);
        }
    }

    // ============================================================
    // 🔹 Busca e analisa Tweets
    // ============================================================
   public void fetchAndStoreTweets(String keyword) {
    log.info("🐦 Iniciando busca e análise de tweets para '{}'", keyword);
 
    try {
        // 🔹 Endpoint real (usar Bearer token válido)
        String url = "https://api.twitter.com/2/tweets/search/recent?query=" 
                     + URLEncoder.encode(keyword, StandardCharsets.UTF_8)
                     + "&max_results=10&tweet.fields=created_at,lang";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer SEU_TOKEN_AQUI");
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        ResponseEntity<Map> response = newsRestTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("data")) {
            log.warn("⚠️ Nenhum tweet retornado pela API do X.");
            return;
        }

        List<Map<String, Object>> tweets = (List<Map<String, Object>>) response.getBody().get("data");
        List<String> textos = tweets.stream()
                .map(t -> (String) t.get("text"))
                .collect(Collectors.toList());

        // 🔹 Envia para Flask (rota específica de tweets)
        URI tweetEndpoint = URI.create("http://localhost:5000/analyze-tweets");
        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<List<String>> req = new HttpEntity<>(textos, jsonHeaders);

        ResponseEntity<List<Map<String, Object>>> flaskResp = flaskRestTemplate.exchange(
                tweetEndpoint, HttpMethod.POST, req, new ParameterizedTypeReference<List<Map<String, Object>>>() {});

        List<Map<String, Object>> analises = flaskResp.getBody();
        if (analises == null) analises = Collections.emptyList();

        for (int i = 0; i < textos.size(); i++) {
            Map<String, Object> tweetData = tweets.get(i);
            String text = textos.get(i);

            // 🔹 Corrigido: garantir ID real
            String tweetId = null;
            Object rawId = tweetData.get("id");
            if (rawId != null) {
            tweetId = rawId.toString().replaceAll("\\.0$", ""); // evita float
            } else if (tweetData.get("id_str") != null) {
            tweetId = tweetData.get("id_str").toString();
            }

String tweetUrl = tweetId != null
        ? "https://x.com/i/web/status/" + tweetId
        : "https://x.com/";


            String label = "neutral";
            double score = 0.0;

            if (i < analises.size()) {
                Map<String, Object> a = analises.get(i);
                label = Objects.toString(a.get("label"), "neutral").toLowerCase();
                Object scr = a.get("score");
                if (scr != null) {
                    try {
                        score = Double.parseDouble(scr.toString());
                    } catch (NumberFormatException ignored) {}
                }
            }

            Item item = new Item();
            item.setTitle(text.substring(0, Math.min(text.length(), 80)) + "...");
            item.setText(text);
            item.setUrl(tweetUrl);
            item.setSourceName("Twitter");
            item.setSentimentLabel(label);
            item.setSentimentScore(score);
            item.setPublishedAt(LocalDateTime.now());
            item.setAnalyzedAt(LocalDateTime.now());
            itemRepository.save(item);

            Sentiment sentiment = Sentiment.builder()
                    .item(item)
                    .label(label)
                    .score(score)
                    .model("BERTweet-Sentiment")
                    .createdAt(LocalDateTime.now())
                    .build();
            sentimentRepository.save(sentiment);

            log.info("💾 Tweet analisado: {} ({}) → {}", label, score, tweetUrl);
        }

    } catch (Exception e) {
        log.error("❌ Erro ao buscar/analisar tweets: {}", e.getMessage());
    }
}


// ============================================================
// 🔹 Buscar últimos tweets salvos no banco e mapear para FeedDTO
// ============================================================
public List<FeedDTO> buscarTweets(int limit, String keyword) {
    log.info("🐦 Buscando últimos tweets armazenados no banco para '{}'", keyword);

    try {
        // Busca os itens mais recentes cuja fonte é "Twitter"
        List<Item> tweets = itemRepository.findTop20BySourceNameOrderByPublishedAtDesc("Twitter");

        if (tweets == null || tweets.isEmpty()) {
            log.warn("⚠️ Nenhum tweet encontrado no banco.");
            return Collections.emptyList();
        }

        // Converte cada Item em FeedDTO
        return tweets.stream()
                .limit(limit)
                .map(item -> {
                    FeedDTO dto = new FeedDTO();
                    dto.setTitle(item.getTitle());
                    dto.setDescription(item.getText());
                    dto.setUrl(item.getUrl());
                    dto.setSource(item.getSourceName());
                    dto.setPublishedAt(
                            item.getPublishedAt() != null
                                    ? item.getPublishedAt().toString()
                                    : LocalDateTime.now().toString()
                    );
                    dto.setSentimento(item.getSentimentLabel());
                    dto.setScore(item.getSentimentScore());
                    dto.setTweet(true);
                    dto.setTweetUrl(item.getUrl());
                    return dto;
                })
                .collect(Collectors.toList());

    } catch (Exception e) {
        log.error("❌ Erro ao buscar tweets do banco: {}", e.getMessage());
        return Collections.emptyList();
    }
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