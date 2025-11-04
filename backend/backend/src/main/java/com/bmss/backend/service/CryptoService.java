package com.bmss.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CryptoService {

    private static final Logger log = LoggerFactory.getLogger(CryptoService.class);
    private final RestTemplate restTemplate;
    private final String coinGeckoApiKey;
    private final String coinGeckoHeaderName;
    private boolean coinGeckoWarningLogged = false;
    
    // Cache local por 30 segundos
    private final Map<String, CacheEntry> priceCache = new ConcurrentHashMap<>();
    private static final long CACHE_DURATION_MS = 30 * 1000; // 30 segundos

    public CryptoService(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${COINGECKO_API_KEY:}") String coinGeckoApiKey,
            @Value("${COINGECKO_API_KEY_HEADER:}") String coinGeckoApiKeyHeader
    ) {
        this.restTemplate = restTemplateBuilder.build();
        this.coinGeckoApiKey = coinGeckoApiKey != null ? coinGeckoApiKey.trim() : "";
        this.coinGeckoHeaderName = resolveCoinGeckoHeaderName(coinGeckoApiKeyHeader, this.coinGeckoApiKey);
    }

    // ============================================================
    // 🔹 MÚLTIPLAS APIS COM FALLBACK
    // ============================================================
    public Map<String, Object> getBitcoinPrice() {
        String cacheKey = "bitcoin_price";
        
        // 🔹 Verifica cache primeiro
        if (priceCache.containsKey(cacheKey)) {
            CacheEntry entry = priceCache.get(cacheKey);
            if (System.currentTimeMillis() - entry.timestamp < CACHE_DURATION_MS) {
                log.info("⚡ Retornando preço do cache");
                return entry.data;
            }
        }

        Map<String, Object> result = new HashMap<>();
        
        // 🔹 Tenta diferentes APIs em ordem
        try {
            result = tryCoinGecko();
            result.put("source", "CoinGecko");
            log.info("✅ Preço obtido da CoinGecko");
        } catch (Exception e1) {
            log.warn("⚠️ CoinGecko falhou: {}", e1.getMessage());
            
            try {
                result = tryBinance();
                result.put("source", "Binance");
                log.info("✅ Preço obtido da Binance");
            } catch (Exception e2) {
                log.warn("⚠️ Binance falhou: {}", e2.getMessage());
                
                try {
                    result = tryCoinCap();
                    result.put("source", "CoinCap");
                    log.info("✅ Preço obtido da CoinCap");
                } catch (Exception e3) {
                    log.warn("⚠️ CoinCap falhou: {}", e3.getMessage());
                    
                    // 🔹 Fallback final
                    result = getFallbackPrice();
                    result.put("source", "Fallback");
                    log.warn("🚨 Usando preço fallback");
                }
            }
        }

        // 🔹 Atualiza cache
        priceCache.put(cacheKey, new CacheEntry(result, System.currentTimeMillis()));
        
        return result;
    }

    // ============================================================
    // 🔹 COINGECKO (com tratamento de rate limit)
    // ============================================================
    private String resolveCoinGeckoHeaderName(String configuredHeader, String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }

        if (configuredHeader != null && !configuredHeader.isBlank()) {
            return configuredHeader.trim();
        }

        return apiKey.startsWith("CG-") ? "x-cg-demo-api-key" : "x-cg-pro-api-key";
    }

    private HttpHeaders buildCoinGeckoHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Accept", "application/json");

        if (coinGeckoApiKey != null && !coinGeckoApiKey.isBlank()) {
            String headerName = coinGeckoHeaderName.isBlank()
                    ? resolveCoinGeckoHeaderName(null, coinGeckoApiKey)
                    : coinGeckoHeaderName;
            headers.add(headerName, coinGeckoApiKey);
        } else if (!coinGeckoWarningLogged) {
            log.warn("⚠️ COINGECKO_API_KEY não configurada. A CoinGecko pode retornar 401 Unauthorized.");
            coinGeckoWarningLogged = true;
        }

        return headers;
    }

    private Map<String, Object> tryCoinGecko() {
        try {
            String url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl&include_24hr_change=true&include_last_updated_at=true";

            HttpEntity<Void> requestEntity = new HttpEntity<>(buildCoinGeckoHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> bitcoinData = (Map<String, Object>) response.getBody().get("bitcoin");

                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("usd", bitcoinData.get("usd"));
                result.put("brl", bitcoinData.get("brl"));
                result.put("change24h", bitcoinData.get("usd_24h_change"));
                result.put("lastUpdated", LocalDateTime.now().toString());

                return result;
            }
            throw new RuntimeException("Resposta inválida da CoinGecko");

        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 401) {
                throw new RuntimeException("CoinGecko: 401 Unauthorized - verifique sua chave de API");
            }
            throw new RuntimeException("CoinGecko: " + e.getStatusCode().value() + " - " + e.getStatusText());
        } catch (Exception e) {
            throw new RuntimeException("CoinGecko: " + e.getMessage());
        }
    }

    // ============================================================
    // 🔹 BINANCE API (sem rate limit para preços)
    // ============================================================
    private Map<String, Object> tryBinance() {
        try {
            // Preço em USD
            String usdUrl = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
            ResponseEntity<Map> usdResponse = restTemplate.getForEntity(usdUrl, Map.class);
            
            // Para converter para BRL, usamos uma API de câmbio
            String exchangeUrl = "https://api.exchangerate.host/latest?base=USD&symbols=BRL";
            ResponseEntity<Map> exchangeResponse = restTemplate.getForEntity(exchangeUrl, Map.class);
            
            if (usdResponse.getStatusCode().is2xxSuccessful() && usdResponse.getBody() != null &&
                exchangeResponse.getStatusCode().is2xxSuccessful() && exchangeResponse.getBody() != null) {
                
                double btcUsd = Double.parseDouble(usdResponse.getBody().get("price").toString());
                Map<String, Object> rates = (Map<String, Object>) exchangeResponse.getBody().get("rates");
                double usdToBrl = Double.parseDouble(rates.get("BRL").toString());
                double btcBrl = btcUsd * usdToBrl;
                
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("usd", btcUsd);
                result.put("brl", btcBrl);
                result.put("change24h", 0.0); // Binance não fornece change24h fácil
                result.put("lastUpdated", LocalDateTime.now().toString());
                
                return result;
            }
            throw new RuntimeException("Resposta inválida da Binance");
            
        } catch (Exception e) {
            throw new RuntimeException("Binance: " + e.getMessage());
        }
    }

    // ============================================================
    // 🔹 COINCAP API (alternativa gratuita)
    // ============================================================
    private Map<String, Object> tryCoinCap() {
        try {
            String url = "https://api.coincap.io/v2/assets/bitcoin";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                
                double usdPrice = Double.parseDouble(data.get("priceUsd").toString());
                
                // Converter para BRL
                String exchangeUrl = "https://api.exchangerate.host/latest?base=USD&symbols=BRL";
                ResponseEntity<Map> exchangeResponse = restTemplate.getForEntity(exchangeUrl, Map.class);
                Map<String, Object> rates = (Map<String, Object>) exchangeResponse.getBody().get("rates");
                double usdToBrl = Double.parseDouble(rates.get("BRL").toString());
                double brlPrice = usdPrice * usdToBrl;
                
                double change24h = Double.parseDouble(data.get("changePercent24Hr").toString());
                
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("usd", usdPrice);
                result.put("brl", brlPrice);
                result.put("change24h", change24h);
                result.put("lastUpdated", LocalDateTime.now().toString());
                
                return result;
            }
            throw new RuntimeException("Resposta inválida da CoinCap");
            
        } catch (Exception e) {
            throw new RuntimeException("CoinCap: " + e.getMessage());
        }
    }

    // ============================================================
    // 🔹 FALLBACK - Preço fixo com atualização manual
    // ============================================================
    private Map<String, Object> getFallbackPrice() {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("usd", 35000.0); // Valor aproximado
        result.put("brl", 175000.0); // Valor aproximado
        result.put("change24h", 0.0);
        result.put("lastUpdated", LocalDateTime.now().toString());
        result.put("message", "Preço aproximado - APIs indisponíveis");
        
        return result;
    }

    // ============================================================
    // 🔹 Cache Entry
    // ============================================================
    private static class CacheEntry {
        Map<String, Object> data;
        long timestamp;
        
        CacheEntry(Map<String, Object> data, long timestamp) {
            this.data = data;
            this.timestamp = timestamp;
        }
    }
}