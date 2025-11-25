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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

    private static final List<RssSource> CRYPTO_RSS_SOURCES = List.of(
            new RssSource("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
            new RssSource("Cointelegraph", "https://br.cointelegraph.com/rss"),
            new RssSource("Decrypt", "https://decrypt.co/feed"),
            new RssSource("NewsBTC", "https://www.newsbtc.com/feed/"),
            new RssSource("Bitcoin Magazine", "https://bitcoinmagazine.com/.rss"),
            new RssSource("InfoMoney Cripto", "https://www.infomoney.com.br/crypto/feed/")
    );

    // ============================================================
    // 🔹 Busca notícias (GNews → fallback RSS)
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String safeKeyword = (keyword == null || keyword.isBlank()) ? "bitcoin" : keyword;
        int safeLimit = limit <= 0 ? 0 : limit;

        if (safeLimit == 0) {
            log.warn("⚠️ Limite zero recebido para busca de notícias. Retornando lista vazia.");
            return Collections.emptyList();
        }

        try {
            List<Item> itens = itemRepository.findTop50ByIsTweetFalseOrIsTweetIsNullOrderByPublishedAtDesc();

            List<FeedDTO> analisadas = itens.stream()
                    .filter(item -> item.getSentimentLabel() != null && !item.getSentimentLabel().isBlank())
                    .map(FeedDTO::fromEntity)
                    .filter(Objects::nonNull)
                    .limit(safeLimit)
                    .collect(Collectors.toList());

            if (!analisadas.isEmpty()) {
                log.info("📦 Retornando {} notícias analisadas do banco.", analisadas.size());
                return analisadas;
            }

            log.info("🔄 Nenhuma notícia analisada encontrada. Disparando coleta e análise via Flask.");
            fetchAndStoreNews(safeKeyword);

            itens = itemRepository.findTop50ByIsTweetFalseOrIsTweetIsNullOrderByPublishedAtDesc();
            analisadas = itens.stream()
                    .filter(item -> item.getSentimentLabel() != null && !item.getSentimentLabel().isBlank())
                    .map(FeedDTO::fromEntity)
                    .filter(Objects::nonNull)
                    .limit(safeLimit)
                    .collect(Collectors.toList());

            if (analisadas.isEmpty()) {
                log.warn("⚠️ Mesmo após a coleta, nenhuma notícia analisada foi encontrada.");
            }

            return analisadas;

        } catch (Exception e) {
            log.error("❌ Erro ao buscar notícias analisadas: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<FeedDTO> coletarNoticiasExternas(int limit, String keyword, boolean bypassCache) {
        String safeKeyword = (keyword == null || keyword.isBlank()) ? "bitcoin" : keyword;
        int safeLimit = limit <= 0 ? 0 : limit;
        String cacheKey = safeKeyword.toLowerCase(Locale.ROOT);

        if (safeLimit == 0) {
            return Collections.emptyList();
        }

        if (!bypassCache && cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log.info("⚡ Retornando notícias do cache externo para: {}", safeKeyword);
                return entry.data.stream().limit(safeLimit).collect(Collectors.toList());
            }
        }

        List<FeedDTO> noticias = fetchFromGNews(safeKeyword);

        if (noticias.isEmpty()) {
            log.warn("⚠️ Nenhuma notícia encontrada na GNews. Ativando fallback via RSS...");
            noticias = fetchFromGoogleNewsRSS(safeKeyword);
        }

        if (noticias.isEmpty()) {
            log.warn("⚠️ Google RSS também falhou. Alternando para feeds RSS públicos de cripto.");
            noticias = fetchFromCryptoRssFeeds(safeKeyword);
        }

        noticias = removeDuplicates(noticias);

        if (!noticias.isEmpty()) {
            cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        }

        return noticias.stream().limit(safeLimit).collect(Collectors.toList());
    }

    private List<FeedDTO> coletarNoticiasExternas(int limit, String keyword) {
        return coletarNoticiasExternas(limit, keyword, false);
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

        } catch (HttpClientErrorException e) {
            log.error("❌ Erro ao acessar GNews (status {}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return Collections.emptyList();
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

    public List<FeedDTO> buscarNoticiasPorSentimento(String sentiment, int limit) {
        log.info("📊 Buscando notícias com sentimento '{}'", sentiment);
        try {
            // 🔹 Converte "neutro" → "neutral", "positivo" → "positive", etc.
            String normalized = normalizeSentimentToEnglish(sentiment);

            if (normalized == null || normalized.isBlank()) {
                log.warn("⚠️ Sentimento recebido vazio ou nulo. Retornando lista vazia.");
                return List.of();
            }

            var allNews = itemRepository.findTop50ByIsTweetFalseOrIsTweetIsNullOrderByPublishedAtDesc();

            // 🔹 Agora a comparação é sempre com valores do banco (em inglês)
            List<FeedDTO> filtradas = allNews.stream()
                    .filter(item -> item.getSentimentLabel() != null)
                    .filter(item -> normalized.equalsIgnoreCase(item.getSentimentLabel()))
                    .limit(limit)
                    .map(FeedDTO::fromEntity)
                    .toList();

            log.info("✅ {} notícias encontradas com sentimento '{}'", filtradas.size(), normalized);

            return filtradas;

        } catch (Exception e) {
            log.error("❌ Erro ao buscar notícias por sentimento: {}", e.getMessage());
            return List.of();
        }
    }


/**
 * Converte "positivo" → "positive", "negativo" → "negative", "neutro" → "neutral"
 */
private String normalizeSentimentToEnglish(String sentiment) {
    if (sentiment == null) return null;
    return switch (sentiment.toLowerCase()) {
        case "positivo", "positive" -> "positive";
        case "negativo", "negative" -> "negative";
        case "neutro", "neutral" -> "neutral";
        default -> sentiment.toLowerCase();
    };
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
        String sanitizedKeyword = (keyword == null || keyword.isBlank()) ? "bitcoin" : keyword.trim();

        try {
            String query = (sanitizedKeyword + " bitcoin mercado financeiro").trim().replaceAll("\\s+", " ");
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String rssUrl = "https://news.google.com/rss/search?q=" + encodedQuery +
                    "&hl=pt-BR&gl=BR&ceid=BR:pt-419";

            URL url = new URL(rssUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; BMSSBot/1.0; +https://bmss.com.br)");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            try (InputStream stream = connection.getInputStream()) {
                DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
                Document doc = builder.parse(stream);
                NodeList items = doc.getElementsByTagName("item");

                // Usar Set para prevenir duplicatas no RSS também
                Set<String> seenUrls = new HashSet<>();

                for (int i = 0; i < items.getLength() && list.size() < 20; i++) {
                    Element el = (Element) items.item(i);
                    String title = getElementText(el, "title");
                    String link = getElementText(el, "link");

                    if (title == null || link == null) {
                        continue;
                    }

                    String resolvedLink = resolveGoogleNewsArticleLink(link);

                    if (resolvedLink == null || resolvedLink.isBlank()) {
                        continue;
                    }

                    if (!resolvedLink.contains("news.google.com") && isBlockedDomain(resolvedLink)) {
                        continue;
                    }

                    String normalizedUrl = normalizeUrl(resolvedLink);
                    if (!seenUrls.add(normalizedUrl)) {
                        continue; // Pular duplicata
                    }

                    String description = Optional.ofNullable(getElementText(el, "description")).orElse("");
                    String publishedAt = normalizeRssDate(getElementText(el, "pubDate"));

                    list.add(new FeedDTO(title, description, resolvedLink, "Google News", publishedAt,
                            "neutral", 0.0, false, null));
                }
            } finally {
                connection.disconnect();
            }

            log.info("🪶 Fallback RSS retornou {} notícias.", list.size());
        } catch (Exception e) {
            log.error("❌ Erro no fallback RSS: {}", e.getMessage());
        }
        return list;
    }

    // ============================================================
    // 🔹 RSS público (sem Google/GNews)
    // ============================================================
    private List<FeedDTO> fetchFromCryptoRssFeeds(String keyword) {
        String sanitizedKeyword = (keyword == null || keyword.isBlank()) ? "bitcoin" : keyword.trim();
        List<FeedDTO> collected = new ArrayList<>();

        for (RssSource source : CRYPTO_RSS_SOURCES) {
            try {
                collected.addAll(parseGenericRss(source, sanitizedKeyword));
            } catch (Exception e) {
                log.warn("⚠️ Falha ao consultar feed {}: {}", source.getName(), e.getMessage());
            }
        }

        log.info("🪙 RSS público retornou {} notícias.", collected.size());
        return collected;
    }

    private List<FeedDTO> parseGenericRss(RssSource source, String keyword) throws Exception {
        List<FeedDTO> list = new ArrayList<>();

        URL url = new URL(source.getUrl());
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; BMSSBot/1.0; +https://bmss.com.br)");
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);

        try (InputStream stream = connection.getInputStream()) {
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            Document doc = builder.parse(stream);
            NodeList items = doc.getElementsByTagName("item");

            for (int i = 0; i < items.getLength() && list.size() < 25; i++) {
                Element el = (Element) items.item(i);
                String title = getElementText(el, "title");
                String link = getElementText(el, "link");

                if (title == null || link == null) {
                    continue;
                }

                String description = Optional.ofNullable(getElementText(el, "description")).orElse("");

                if (!isRelevantNews(title, description, keyword)) {
                    continue;
                }

                String publishedAt = normalizeRssDate(getElementText(el, "pubDate"));

                list.add(new FeedDTO(
                        title,
                        description,
                        link,
                        source.getName(),
                        publishedAt,
                        "neutral",
                        0.0,
                        false,
                        null
                ));
            }
        } finally {
            connection.disconnect();
        }

        return list;
    }

    private String getElementText(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagName(tagName);
        if (nodes.getLength() == 0 || nodes.item(0) == null) {
            return null;
        }
        return nodes.item(0).getTextContent();
    }

    private String normalizeRssDate(String pubDateRaw) {
        if (pubDateRaw == null || pubDateRaw.isBlank()) {
            return LocalDateTime.now().toString();
        }

        try {
            OffsetDateTime odt = OffsetDateTime.parse(pubDateRaw, DateTimeFormatter.RFC_1123_DATE_TIME);
            return odt.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime().toString();
        } catch (DateTimeParseException e) {
            log.debug("⚠️ Não foi possível converter pubDate do RSS: {}", pubDateRaw);
            return LocalDateTime.now().toString();
        }
    }

    private String resolveGoogleNewsArticleLink(String link) {
        if (link == null || link.isBlank() || !link.contains("news.google.com")) {
            return link;
        }

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(link).openConnection();
            connection.setInstanceFollowRedirects(true);
            connection.setRequestMethod("HEAD");
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (compatible; BMSSBot/1.0; +https://bmss.com.br)");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            int status = connection.getResponseCode();
            if (isRedirectStatus(status)) {
                String location = connection.getHeaderField("Location");
                if (location != null && !location.isBlank()) {
                    return location;
                }
            }

            String finalUrl = connection.getURL().toString();
            return (finalUrl != null && !finalUrl.isBlank()) ? finalUrl : link;

        } catch (IOException e) {
            log.warn("⚠️ Falha ao resolver link do Google News '{}': {}", link, e.getMessage());
            return link;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private boolean isRedirectStatus(int status) {
        return status == HttpURLConnection.HTTP_MOVED_PERM
                || status == HttpURLConnection.HTTP_MOVED_TEMP
                || status == HttpURLConnection.HTTP_SEE_OTHER
                || status == HttpURLConnection.HTTP_MULT_CHOICE
                || status == 307
                || status == 308;
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
            List<FeedDTO> noticias = coletarNoticiasExternas(20, keyword, true);
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
                        } catch (NumberFormatException ignored) {
                        }
                    }
                }

                dto.setSentimento(label);
                dto.setScore(score);

                if (itemRepository.existsByUrl(dto.getUrl())) {
                    log.debug("Pulando notícia já existente: {}", dto.getUrl());
                    skippedCount++;
                    continue;
                }

                try {
                    Item item = Item.builder()
                            .title(dto.getTitle())
                            .text(dto.getDescription())
                            .url(dto.getUrl())
                            .sourceName(dto.getSource())
                            .sentimentLabel(label)
                            .sentimentScore(score)
                            .publishedAt(LocalDateTime.now())
                            .analyzedAt(LocalDateTime.now())
                            .isTweet(false)
                            .build();

                    Item savedItem = itemRepository.save(item);

                    Sentiment sentiment = Sentiment.builder()
                            .item(savedItem)
                            .label(label)
                            .score(score)
                            .model("cardiffnlp/twitter-roberta-base-sentiment-latest")
                            .createdAt(LocalDateTime.now())
                            .build();
                    sentimentRepository.save(sentiment);

                    log.info("Salvo: {} ({}) → {}", label.toUpperCase(), score, dto.getTitle());
                    savedCount++;

                } catch (Exception e) {
                    log.error("Erro ao salvar notícia: {}", e.getMessage());
                }
            }

            log.info("🏁 {}/{} notícias analisadas e persistidas com sucesso! ({} puladas)", 
                    savedCount, noticias.size(), skippedCount);
        }
    }

    
// ============================================================
// 🔹 Busca e analisa Tweets (COMPLETAMENTE REVISADO)
// ============================================================
public void fetchAndStoreTweets(String keyword) {
    log.info("🐦 Iniciando busca e análise de tweets para '{}'", keyword);

    try {
        //  TOKEN VÁLIDO DA API DO TWITTER 
        String bearerToken = "AAAAAAAAAAAAAAAAAAAAAPUm5QEAAAAAsVmaPixVJE0AEiLWHLimAf0Ilw8%3DxcU1G3JVGtiHoyqMcIKgeLamtd2LwqexlO5XTESZYSvOUtWpFi"; // TODO: Colocar token real
        
        String url = "https://api.twitter.com/2/tweets/search/recent?query="
                + URLEncoder.encode("bitcoin OR criptomoeda", StandardCharsets.UTF_8)
                + "&max_results=10&tweet.fields=created_at,lang,author_id";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + bearerToken);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        log.info("🔍 Buscando tweets na API do Twitter...");

        ResponseEntity<Map> response = newsRestTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);

        if (response.getBody() == null || !response.getBody().containsKey("data")) {
            log.warn("⚠️ Nenhum tweet retornado pela API do X. Body: {}", response.getBody());
            return;
        }

        List<Map<String, Object>> tweets = (List<Map<String, Object>>) response.getBody().get("data");
        
        if (tweets == null || tweets.isEmpty()) {
            log.warn("⚠️ Lista de tweets vazia.");
            return;
        }

        List<String> textos = tweets.stream()
                .map(t -> (String) t.get("text"))
                .collect(Collectors.toList());

        log.info("📨 Enviando {} tweets para análise de sentimento", textos.size());

        // ✅ CORREÇÃO CRÍTICA: Configurar POST JSON corretamente
        HttpHeaders flaskHeaders = new HttpHeaders();
        flaskHeaders.setContentType(MediaType.APPLICATION_JSON);
        flaskHeaders.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        HttpEntity<List<String>> requestEntity = new HttpEntity<>(textos, flaskHeaders);

        log.info("🚀 Chamando Flask em: {}", tweetsFlaskEndpoint);

        ResponseEntity<List<Map<String, Object>>> flaskResponse;
        try {
            flaskResponse = flaskRestTemplate.exchange(
                    tweetsFlaskEndpoint,
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
        } catch (RestClientException e) {
            log.error("❌ Erro na comunicação com Flask: {}", e.getMessage());
            return;
        }

        // 🔹 VERIFICAÇÃO DETALHADA DA RESPOSTA
        if (!flaskResponse.getStatusCode().is2xxSuccessful()) {
            log.error("❌ Flask retornou status HTTP: {}", flaskResponse.getStatusCode());
            return;
        }

        List<Map<String, Object>> analises = flaskResponse.getBody();
        if (analises == null) {
            log.error("❌ Flask retornou corpo vazio");
            return;
        }

        log.info("✅ Flask analisou {} tweets com sucesso", analises.size());

        // ============================================================
        // 🔹 PERSISTÊNCIA CORRIGIDA COM NOVOS CAMPOS
        // ============================================================
        int savedCount = 0;
        
        for (int i = 0; i < tweets.size(); i++) {
            Map<String, Object> tweetData = tweets.get(i);
            String texto = (String) tweetData.get("text");
            String tweetId = (String) tweetData.get("id");
            
            // 🔹 Verificar se tweet já existe
            if (itemRepository.existsByTweetId(tweetId)) {
                log.debug("⏩ Pulando tweet já existente: {}", tweetId);
                continue;
            }

            // 🔹 Valores padrão
            String label = "neutral";
            double score = 0.0;

            // 🔹 Aplicar análise do Flask se disponível
            if (i < analises.size()) {
                Map<String, Object> analise = analises.get(i);
                label = Objects.toString(analise.get("label"), "neutral").toLowerCase();
                Object scr = analise.get("score");
                if (scr != null) {
                    try {
                        score = Double.parseDouble(scr.toString());
                    } catch (NumberFormatException ignored) {
                        log.warn("⚠️ Score inválido do Flask: {}", scr);
                    }
                }
            }

            // 🔹 Criar URL do tweet
            String tweetUrl = "https://x.com/i/web/status/" + tweetId;

            // 🔹 CRIAR ITEM COM TODOS OS CAMPOS
            Item item = Item.builder()
                    .title(texto.length() > 80 ? texto.substring(0, 77) + "..." : texto)
                    .text(texto)
                    .url(tweetUrl)
                    .sourceName("Twitter")
                    .sentimentLabel(label)
                    .sentimentScore(score)
                    .publishedAt(parseTwitterDate(tweetData.get("created_at")))
                    .analyzedAt(LocalDateTime.now())
                    .isTweet(true)          // 🔹 CAMPO NOVO
                    .tweetId(tweetId)       // 🔹 CAMPO NOVO
                    .build();

            try {
                // 🔹 Salvar Item primeiro
                Item savedItem = itemRepository.save(item);
                log.debug("💾 Item salvo com ID: {}", savedItem.getId());

                // 🔹 Criar Sentiment associado
                Sentiment sentiment = Sentiment.builder()
                        .item(savedItem)
                        .label(label)
                        .score(score)
                        .model("Twitter-RoBERTa-Crypto")
                        .createdAt(LocalDateTime.now())
                        .build();

                sentimentRepository.save(sentiment);
                savedCount++;
                
                log.info("✅ Tweet {} salvo: {} ({})", tweetId, label.toUpperCase(), score);
                
            } catch (Exception e) {
                log.error("❌ Erro ao salvar tweet {}: {}", tweetId, e.getMessage());
            }
        }

        log.info("🏁 Persistência concluída: {}/{} tweets salvos", savedCount, tweets.size());

    } catch (Exception e) {
        log.error("❌ Erro crítico em fetchAndStoreTweets: {}", e.getMessage(), e);
    }
}

// 🔹 Método auxiliar para parse de data do Twitter
private LocalDateTime parseTwitterDate(Object dateObj) {
    if (dateObj == null) return LocalDateTime.now();
    
    try {
        String dateStr = dateObj.toString();
        // Formato: 2024-01-15T10:30:00.000Z
        return LocalDateTime.parse(dateStr.replace("Z", ""), 
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"));
    } catch (Exception e) {
        log.warn("⚠️ Erro ao parse data do tweet, usando data atual");
        return LocalDateTime.now();
    }
}



// ============================================================
// 🔹 Buscar últimos tweets salvos no banco e mapear para FeedDTO
// ============================================================
    public List<FeedDTO> buscarTweets(int limit, String keyword) {
        log.info("🐦 Buscando últimos tweets armazenados no banco para '{}'", keyword);

        try {
            List<Item> tweets = itemRepository.findTop50ByIsTweetTrueOrderByPublishedAtDesc();

            if (tweets == null || tweets.isEmpty()) {
                log.warn("⚠️ Nenhum tweet encontrado usando flag isTweet. Tentando fallback por fonte.");
                tweets = itemRepository.findTop20BySourceNameOrderByPublishedAtDesc("Twitter");
            }

            if (tweets == null || tweets.isEmpty()) {
                log.warn("⚠️ Nenhum tweet encontrado no banco.");
                return Collections.emptyList();
            }

            return tweets.stream()
                    .limit(limit)
                    .map(FeedDTO::fromEntity)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("❌ Erro ao buscar tweets do banco: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    public List<FeedDTO> buscarTweetsPorSentimento(String sentiment, int limit) {
        try {
            String normalized = normalizeSentimentToEnglish(sentiment);

            if (normalized == null || normalized.isBlank()) {
                log.warn("⚠️ Sentimento para tweets vazio. Retornando lista vazia.");
                return List.of();
            }

            List<Item> tweets = itemRepository.findTop50ByIsTweetTrueOrderByPublishedAtDesc();

            if (tweets == null || tweets.isEmpty()) {
                log.warn("⚠️ Nenhum tweet encontrado usando flag isTweet. Tentando fallback por fonte.");
                tweets = itemRepository.findTop20BySourceNameOrderByPublishedAtDesc("Twitter");
            }

            if (tweets == null || tweets.isEmpty()) {
                return List.of();
            }

            List<FeedDTO> filtrados = tweets.stream()
                    .filter(item -> item.getSentimentLabel() != null)
                    .filter(item -> normalized.equalsIgnoreCase(item.getSentimentLabel()))
                    .limit(limit)
                    .map(FeedDTO::fromEntity)
                    .collect(Collectors.toList());

            log.info("✅ {} tweets encontrados com sentimento '{}'", filtrados.size(), normalized);

            return filtrados;

        } catch (Exception e) {
            log.error("❌ Erro ao buscar tweets por sentimento: {}", e.getMessage());
            return List.of();
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

    private static class RssSource {
        private final String name;
        private final String url;

        RssSource(String name, String url) {
            this.name = name;
            this.url = url;
        }

        public String getName() {
            return name;
        }

        public String getUrl() {
            return url;
        }
    }
}
