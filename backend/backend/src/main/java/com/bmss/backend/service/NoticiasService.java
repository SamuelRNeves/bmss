package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.w3c.dom.*;
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

    private final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private final String NEWS_API_URL = "https://newsapi.org/v2/everything";
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    // 🚫 Fontes e domínios a evitar
    private static final List<String> BLOCKED_DOMAINS = Arrays.asList(
            "itiny.xyz", "rssing.com", "feedproxy.google",
            "flipboard.com", "biztoc.com", "techspotlight.xyz",
            "news.google.com", "toptechjournal.xyz", "duckduckgo.com"
    );

    // 🌟 Fontes confiáveis (para ordenação e priorização)
    private static final List<String> TRUSTED_SOURCES = Arrays.asList(
            "coindesk.com", "reuters.com", "investing.com", "bloomberg.com",
            "infomoney.com.br", "exame.com", "forbes.com", "cnnbrasil.com.br",
            "valor.globo.com", "bbc.com", "oglobo.globo.com"
    );

    // ============================================================
    // 🔹 Busca notícias (com cache, filtro e fallback via RSS)
    // ============================================================
    public List<FeedDTO> buscarNoticias(int limit, String keyword) {
        String cacheKey = keyword.toLowerCase();

        // 1️⃣ Verifica cache
        if (cache.containsKey(cacheKey)) {
            CacheEntry entry = cache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                System.out.println("⚡ Retornando notícias do cache para: " + keyword);
                return entry.data.stream().limit(limit).collect(Collectors.toList());
            }
        }

        // 2️⃣ Busca na NewsAPI
        List<FeedDTO> noticias = fetchNewsFromApi(keyword);

        // 3️⃣ Fallback: se vier vazio, usa RSS
        if (noticias.isEmpty()) {
            System.out.println("⚠️ NewsAPI vazia. Usando fallback RSS...");
            noticias = fetchFromGoogleNewsRSS(keyword);
        }

        // 4️⃣ Se ainda estiver vazio, usa fallback estático
        if (noticias.isEmpty()) {
            noticias = getFallbackNoticias();
        }

        cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 Busca na NewsAPI (com filtros e deduplicação)
    // ============================================================
    private List<FeedDTO> fetchNewsFromApi(String keyword) {
        String query = keyword + " OR bitcoin OR criptomoeda OR mercado financeiro OR política OR geopolítica";
    
        // 🔹 Troca para NewsData.io (evita links quebrados)
        String url = "https://newsdata.io/api/1/news?apikey=pub_50449d7e7f6f9ffb3b5a2c97c6f557e7"
                + "&q=" + query
                + "&language=pt"
                + "&country=br"
                + "&category=business,politics"
                + "&page=1";
    
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    Map.class
            );
    
            if (response.getBody() == null || response.getBody().get("results") == null)
                return Collections.emptyList();
    
            List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody().get("results");
    
            // 🔹 Filtro de fontes confiáveis (whitelist)
            List<String> fontesConfiaveis = List.of(
                    "CoinDesk", "InfoMoney", "Valor Econômico", "Exame",
                    "Bloomberg", "Reuters", "CoinTelegraph", "Investing.com",
                    "BBC", "Estadão", "CNN Brasil", "Forbes Brasil"
            );
    
            return results.stream()
                    .filter(a -> a.get("title") != null && a.get("link") != null)
                    .filter(a -> {
                        Object sourceObj = a.get("source_id");
                        if (sourceObj == null) return true;
                        String fonte = sourceObj.toString();
                        return fontesConfiaveis.stream()
                                .anyMatch(f -> fonte.toLowerCase().contains(f.toLowerCase()));
                    })
                    .map(a -> {
                        FeedDTO dto = new FeedDTO();
                        dto.setTitle((String) a.get("title"));
                        dto.setDescription((String) a.getOrDefault("description", "Sem descrição"));
                        dto.setUrl((String) a.get("link"));
                        dto.setSource((String) a.getOrDefault("source_id", "Desconhecida"));
                        dto.setPublishedAt((String) a.getOrDefault("pubDate", LocalDateTime.now().toString()));
                        dto.setSentimento("neutral");
                        dto.setScore(0.0);
                        return dto;
                    })
                    .limit(20)
                    .collect(Collectors.toList());
    
        } catch (Exception e) {
            System.err.println("❌ Erro ao acessar NewsData.io: " + e.getMessage());
            return Collections.emptyList();
        }
    }
    

    // ============================================================
    // 🔹 Fallback: busca via RSS do Google News (PT-BR)
    // ============================================================
    private List<FeedDTO> fetchFromGoogleNewsRSS(String keyword) {
        List<FeedDTO> list = new ArrayList<>();
        try {
            String rssUrl = "https://news.google.com/rss/search?q=" + keyword + "+bitcoin+cripto&hl=pt-BR&gl=BR&ceid=BR:pt-419";
            URL url = new URL(rssUrl);
            InputStream stream = url.openStream();
            DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
            Document doc = builder.parse(stream);
            NodeList items = doc.getElementsByTagName("item");

            for (int i = 0; i < items.getLength() && i < 20; i++) {
                Element el = (Element) items.item(i);
                String title = el.getElementsByTagName("title").item(0).getTextContent();
                String link = el.getElementsByTagName("link").item(0).getTextContent();
                String pubDate = el.getElementsByTagName("pubDate").item(0).getTextContent();

                if (isBlockedDomain(link)) continue;

                list.add(new FeedDTO(title, "", link, "Google News", pubDate, "neutral", 0.0));
            }

            System.out.println("🪶 Fallback RSS retornou " + list.size() + " notícias.");
        } catch (Exception e) {
            System.err.println("❌ Erro no fallback RSS: " + e.getMessage());
        }
        return list;
    }

    // ============================================================
    // 🔹 Bloqueia domínios indesejados
    // ============================================================
    private boolean isBlockedDomain(String url) {
        return BLOCKED_DOMAINS.stream().anyMatch(url::contains);
    }

    // ============================================================
    // 🔹 Fallback local (estático)
    // ============================================================
    private List<FeedDTO> getFallbackNoticias() {
        return List.of(
                new FeedDTO("Bitcoin rompe resistência dos 70 mil dólares",
                        "Investidores voltam a apostar em alta após semana de estabilidade.",
                        "https://www.infomoney.com.br/mercados/bitcoin-rompe-resistencia/",
                        "InfoMoney", "2025-10-21T12:30:00Z", "positive", 0.9),

                new FeedDTO("ETF de Bitcoin atrai fluxo recorde em outubro",
                        "Fundos institucionais voltam a registrar forte entrada de capital.",
                        "https://exame.com/mercados/etf-de-bitcoin-recorde/",
                        "Exame", "2025-10-20T18:00:00Z", "neutral", 0.1),

                new FeedDTO("Mercado prevê corte de juros e impacto no BTC",
                        "Expectativas de política monetária voltam a favorecer criptoativos.",
                        "https://valor.globo.com/financas/noticia/2025/10/19/bitcoin-e-juros.ghtml",
                        "Valor Econômico", "2025-10-19T15:45:00Z", "positive", 0.8)
        );
    }

    // ============================================================
    // 🔹 Cache interno simples
    // ============================================================
    private static class CacheEntry {
        List<FeedDTO> data;
        long timestamp;
        CacheEntry(List<FeedDTO> data, long timestamp) {
            this.data = data;
            this.timestamp = timestamp;
        }
    }
    // ============================================================
// 🔹 Integração com IA (Flask) — análise em lote
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
// 🔹 Buscar notícias, analisar e persistir (para botão/cron)
// ============================================================
public void fetchAndStoreNews(String keyword) {
    // Busca notícias (com filtros/whitelist/cache já aplicados)
    List<FeedDTO> noticias = buscarNoticias(20, keyword);
    if (noticias == null || noticias.isEmpty()) {
        System.out.println("⚠️ Nenhuma notícia para importar.");
        return;
    }

    // Monta textos "Título. Descrição" para análise em lote
    List<String> textos = noticias.stream()
            .map(n -> (n.getTitle() != null ? n.getTitle() : "") + ". " +
                      (n.getDescription() != null ? n.getDescription() : ""))
            .collect(Collectors.toList());

    // Chama Flask
    List<Map<String, Object>> analises = analyzeBatch(textos);

    // Persiste cada item com sentimento/score
    for (int i = 0; i < noticias.size(); i++) {
        FeedDTO dto = noticias.get(i);
        Item item = new Item();
        item.setText(dto.getDescription());
        item.setUrl(dto.getUrl());
        item.setSourceName(dto.getSource());

        try {
            // publishedAt vem em ISO 8601 (ex: 2025-10-21T12:30:00Z)
            String iso = dto.getPublishedAt();
            if (iso != null) {
                item.setPublishedAt(LocalDateTime.parse(iso.replace("Z", "")));
            } else {
                item.setPublishedAt(LocalDateTime.now());
            }
        } catch (Exception e) {
            item.setPublishedAt(LocalDateTime.now());
        }

        if (i < analises.size() && analises.get(i) != null) {
            Map<String, Object> a = analises.get(i);
            item.setSentimentLabel(String.valueOf(a.getOrDefault("label", "neutral")));
            Object scoreObj = a.getOrDefault("score", 0.0);
            item.setSentimentScore(Double.valueOf(scoreObj.toString()));
        } else {
            // fallback: o próprio DTO já vem com neutral/0.0
            item.setSentimentLabel(dto.getSentimento());
            item.setSentimentScore(dto.getScore());
        }

        item.setAnalyzedAt(LocalDateTime.now());
        itemRepository.save(item);
    }

    System.out.println("✅ " + noticias.size() + " notícias importadas e analisadas com sucesso!");
}

}
