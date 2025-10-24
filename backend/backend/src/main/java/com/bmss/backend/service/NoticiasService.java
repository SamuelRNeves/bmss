package com.bmss.backend.service;

import com.bmss.backend.dto.FeedDTO;
import com.bmss.backend.model.Item;
import com.bmss.backend.model.Sentiment;
import com.bmss.backend.repository.ItemRepository;
import com.bmss.backend.repository.SentimentRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
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


    private final String NEWS_API_KEY = "2397c71979b14eaea433a03179807359";
    private final String NEWS_API_URL = "https://newsapi.org/v2/everything";
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 5 * 60 * 1000;

    private static final List<String> BLOCKED_DOMAINS = Arrays.asList(
            "itiny.xyz", "rssing.com", "feedproxy.google",
            "flipboard.com", "biztoc.com", "techspotlight.xyz",
            "news.google.com", "toptechjournal.xyz", "duckduckgo.com"
    );

    // ============================================================
    // 🔹 Busca notícias reais com cache e fallback
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

        // 🔹 2. Busca na NewsAPI
        List<FeedDTO> noticias = fetchFromNewsApi(keyword);

        // 🔹 3. Fallback via RSS
        if (noticias.isEmpty()) {
            System.out.println("⚠️ Nenhuma notícia encontrada na NewsAPI. Usando fallback RSS...");
            noticias = fetchFromGoogleNewsRSS(keyword);
        }

        // 🔹 4. Cacheia se houver resultado
        if (!noticias.isEmpty()) {
            cache.put(cacheKey, new CacheEntry(noticias, System.currentTimeMillis()));
        }

        return noticias.stream().limit(limit).collect(Collectors.toList());
    }

    // ============================================================
    // 🔹 Busca na NewsAPI.org com a sua chave real
    // ============================================================
    private List<FeedDTO> fetchFromNewsApi(String keyword) {
        String GNEWS_API_KEY = "c413eaed68da399c2ef9fa585fe591aa"; // crie em https://gnews.io
        String query = keyword + " OR bitcoin OR criptomoeda OR economia OR política";
        String url = "https://gnews.io/api/v4/search?q=" + query +
                "&lang=pt&country=br&max=20&apikey=" + GNEWS_API_KEY;
    
        System.out.println("🌍 [GNews] Buscando notícias: " + url);
    
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);
    
            if (response.getBody() == null || response.getBody().get("articles") == null) {
                System.out.println("⚠️ Nenhum artigo retornado pela GNews");
                return Collections.emptyList();
            }
    
            List<Map<String, Object>> articles = (List<Map<String, Object>>) response.getBody().get("articles");
    
            List<FeedDTO> list = articles.stream()
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
                    .limit(30)
                    .collect(Collectors.toList());
    
            System.out.println("✅ GNews retornou " + list.size() + " notícias reais.");
            return list;
    
        } catch (Exception e) {
            System.err.println("❌ Erro ao acessar GNews: " + e.getMessage());
            return Collections.emptyList();
        }
    }
    

    // ============================================================
    // 🔹 Fallback via RSS do Google News
    // ============================================================
    private List<FeedDTO> fetchFromGoogleNewsRSS(String keyword) {
        List<FeedDTO> list = new ArrayList<>();
        try {
            String rssUrl = "https://news.google.com/rss/search?q=" + keyword + "+bitcoin+mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt-419";
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
// 🔹 Integração com IA (Flask) — análise em lote 
// ============================================================
public List<Map<String, Object>> analyzeBatch(List<String> textos) {
    if (textos == null || textos.isEmpty()) {
        log.warn("⚠️ Nenhum texto enviado para o Flask.");
        return Collections.emptyList();
    }

    try {
        String flaskUrl = "http://localhost:5000/analyze-batch"; // ou 192.168.18.2 se estiver na mesma rede

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        // 🔹 Loga o payload antes do envio
        log.info("📦 Enviando payload ao Flask: {}", textos);

        HttpEntity<List<String>> request = new HttpEntity<>(textos, headers);

        ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                flaskUrl,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
        );
        
        //REMOVER DEPOIS
        System.out.println("📩 RAW Response do Flask: " + response.getBody());



        if (response.getStatusCode() != HttpStatus.OK) {
            log.warn("⚠️ Flask retornou status HTTP {}", response.getStatusCode());
            return Collections.emptyList();
        }

        List<Map<String, Object>> body = response.getBody();

        if (body == null || body.isEmpty()) {
            log.warn("⚠️ Corpo do Flask vazio!");
            return Collections.emptyList();
        }

        log.info("✅ Recebido do Flask: {} análises. Exemplo: {}", body.size(), body.get(0));
        return body;

    } catch (Exception e) {
        log.error("❌ Erro ao chamar Flask: {}", e.getMessage(), e);
        return Collections.emptyList();
    }
}



    
    

    // ============================================================
    // 🔹 Buscar, analisar e salvar no banco
    // ============================================================
    // ============================================================
// 🔹 Buscar, analisar e salvar no banco
// ============================================================
public void fetchAndStoreNews(String keyword) {
    List<FeedDTO> noticias = buscarNoticias(20, keyword);
    if (noticias == null || noticias.isEmpty()) {
        System.out.println("⚠️ Nenhuma notícia para importar.");
        return;
    }

    // Junta título + descrição para análise
    List<String> textos = noticias.stream()
            .map(n -> (n.getTitle() != null ? n.getTitle() : "") + ". " +
                      (n.getDescription() != null ? n.getDescription() : ""))
            .collect(Collectors.toList());

    List<Map<String, Object>> analises = analyzeBatch(textos);

    if (analises == null || analises.isEmpty()) {
        System.out.println("⚠️ Nenhuma análise recebida do Flask. Mantendo sentimento neutro.");
    }

    // Processa e salva notícia por notícia
   for (int i = 0; i < noticias.size(); i++) {
    FeedDTO dto = noticias.get(i);
    Map<String, Object> analise = (i < analises.size()) ? analises.get(i) : null;

    String label = "neutral";
    double score = 0.0;

    if (analise != null) {
        Object lbl = analise.get("label");
        Object scr = analise.get("score");
        if (lbl != null) label = lbl.toString();
        if (scr != null) {
            try {
                score = Double.parseDouble(scr.toString());
            } catch (NumberFormatException ignored) {}
        }
    }

    dto.setSentimento(label);
    dto.setScore(score);

    // 🔹 Cria e salva o Item
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

    // 🔹 Cria e salva o registro de Sentimento vinculado ao Item
    Sentiment sentiment = Sentiment.builder()
            .item(item)
            .label(label)
            .score(score)
            .model("pysentimiento/robertuito-sentiment-analysis")
            .createdAt(LocalDateTime.now())
            .build();
    sentimentRepository.save(sentiment);
}

System.out.println("✅ " + noticias.size() + " notícias analisadas e salvas com sucesso!");

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
