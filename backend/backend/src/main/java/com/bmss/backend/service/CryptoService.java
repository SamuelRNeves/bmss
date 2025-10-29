// CryptoService.java
package com.bmss.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class CryptoService {

    private static final Logger log = LoggerFactory.getLogger(CryptoService.class);
    private final RestTemplate restTemplate;

    public CryptoService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder.build();
    }

    public Map<String, Object> getBitcoinPrice() {
        try {
            String url = "http://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl&include_24hr_change=true&include_last_updated_at=true";
            
            log.info("🔗 Buscando cotação do Bitcoin na CoinGecko...");
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> bitcoinData = (Map<String, Object>) response.getBody().get("bitcoin");
            
            if (bitcoinData == null) {
                log.warn("⚠️ Nenhum dado do Bitcoin retornado pela API");
                return getFallbackData();
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("usd", bitcoinData.get("usd"));
            result.put("brl", bitcoinData.get("brl"));
            result.put("change24h", bitcoinData.get("usd_24h_change"));
            result.put("lastUpdated", LocalDateTime.now().toString());
            result.put("source", "CoinGecko");
            result.put("success", true);
            
            log.info("✅ Cotação BTC: USD ${}, BRL R${}, Variação 24h: {}%", 
                    result.get("usd"), result.get("brl"), result.get("change24h"));
            
            return result;
            
        } catch (Exception e) {
            log.error("❌ Erro ao buscar cotação do Bitcoin: {}", e.getMessage());
            return getFallbackData();
        }
    }

    private Map<String, Object> getFallbackData() {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("usd", 0);
        fallback.put("brl", 0);
        fallback.put("change24h", 0);
        fallback.put("lastUpdated", LocalDateTime.now().toString());
        fallback.put("source", "Fallback");
        fallback.put("success", false);
        return fallback;
    }
}