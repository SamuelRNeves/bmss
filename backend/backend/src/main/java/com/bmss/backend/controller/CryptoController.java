package com.bmss.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/crypto")
public class CryptoController {

    // Cache simples em memória (em produção use Redis)
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private long lastCacheUpdate = 0;
    private static final long CACHE_DURATION = 300000; // 5 minutos

    @GetMapping("/bitcoin")
    public ResponseEntity<?> getBitcoinPrice() {
        try {
            String cacheKey = "bitcoin_price";
            
            // Verificar cache
            if (cache.containsKey(cacheKey) && (System.currentTimeMillis() - lastCacheUpdate) < CACHE_DURATION) {
                return ResponseEntity.ok(cache.get(cacheKey));
            }

            RestTemplate restTemplate = new RestTemplate();
            
            // API CoinGecko para preço atual
            String url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true";
            
            Map response = restTemplate.getForObject(url, Map.class);
            
            Map<String, Object> resultado = new HashMap<>();
            
            if (response != null && response.containsKey("bitcoin")) {
                Map<String, Object> bitcoinData = (Map<String, Object>) response.get("bitcoin");
                
                resultado.put("success", true);
                resultado.put("price", bitcoinData.get("usd"));
                resultado.put("change24h", bitcoinData.get("usd_24h_change"));
                resultado.put("lastUpdated", bitcoinData.get("last_updated_at"));
                resultado.put("currency", "USD");
            } else {
                // Fallback com dados estáticos atualizados
                resultado.put("success", true);
                resultado.put("price", 64500.50);
                resultado.put("change24h", 2.3);
                resultado.put("lastUpdated", System.currentTimeMillis() / 1000);
                resultado.put("currency", "USD");
                resultado.put("isFallback", true);
            }
            
            // Atualizar cache
            cache.put(cacheKey, resultado);
            lastCacheUpdate = System.currentTimeMillis();
            
            return ResponseEntity.ok(resultado);
            
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback garantido
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("success", true);
            fallback.put("price", 64500.50);
            fallback.put("change24h", 2.3);
            fallback.put("lastUpdated", System.currentTimeMillis() / 1000);
            fallback.put("currency", "USD");
            fallback.put("isFallback", true);
            return ResponseEntity.ok(fallback);
        }
    }

    @GetMapping("/bitcoin/historico-completo")
    public ResponseEntity<?> getHistoricoCompletoBitcoin() {
        try {
            String cacheKey = "bitcoin_historico_completo";
            
            // Verificar cache
            if (cache.containsKey(cacheKey) && (System.currentTimeMillis() - lastCacheUpdate) < CACHE_DURATION) {
                return ResponseEntity.ok(cache.get(cacheKey));
            }

            RestTemplate restTemplate = new RestTemplate();
            restTemplate.setErrorHandler(new org.springframework.web.client.DefaultResponseErrorHandler() {
                @Override
                public boolean hasError(org.springframework.http.client.ClientHttpResponse response) {
                    return false; // Não tratar como erro para evitar exceptions
                }
            });
            
            // Tentar API com intervalo maior para evitar rate limit
            String url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=3650&interval=monthly";
            
            try {
                Map response = restTemplate.getForObject(url, Map.class);
                
                if (response != null && response.containsKey("prices")) {
                    Map<String, Object> resultado = new HashMap<>();
                    resultado.put("success", true);
                    resultado.put("data", response);
                    
                    cache.put(cacheKey, resultado);
                    lastCacheUpdate = System.currentTimeMillis();
                    
                    return ResponseEntity.ok(resultado);
                }
            } catch (Exception apiError) {
                System.out.println("API CoinGecko falhou, usando fallback: " + apiError.getMessage());
            }
            
            // Fallback para dados históricos
            Map<String, Object> fallbackResult = criarDadosHistoricosFallback();
            cache.put(cacheKey, fallbackResult);
            lastCacheUpdate = System.currentTimeMillis();
            
            return ResponseEntity.ok(fallbackResult);
            
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback garantido
            Map<String, Object> fallbackResult = criarDadosHistoricosFallback();
            return ResponseEntity.ok(fallbackResult);
        }
    }

    private Map<String, Object> criarDadosHistoricosFallback() {
        Map<String, Object> resultado = new HashMap<>();
        resultado.put("success", true);
        resultado.put("isFallback", true);
        
        // Dados históricos realistas do Bitcoin
        List<List<Number>> prices = new ArrayList<>();
        List<List<Number>> volumes = new ArrayList<>();
        
        long now = System.currentTimeMillis();
        Random random = new Random();
        
        // Gerar dados desde 2009 até hoje (pontos mensais)
        for (int year = 2009; year <= 2024; year++) {
            for (int month = 0; month < 12; month++) {
                if (year == 2024 && month > 9) break; // Até outubro de 2024
                
                long timestamp = new GregorianCalendar(year, month, 1).getTimeInMillis();
                
                // Preços históricos realistas baseados em dados reais
                double price = calcularPrecoHistorico(year, month, random);
                double volume = 10000000 + random.nextDouble() * 50000000; // Volume em milhões
                
                prices.add(Arrays.asList(timestamp, price));
                volumes.add(Arrays.asList(timestamp, volume));
            }
        }
        
        Map<String, Object> data = new HashMap<>();
        data.put("prices", prices);
        data.put("total_volumes", volumes);
        
        resultado.put("data", data);
        return resultado;
    }
    
    private double calcularPrecoHistorico(int year, int month, Random random) {
        // Preços históricos aproximados baseados em dados reais
        double basePrice;
        
        switch (year) {
            case 2009: basePrice = 0.001 + random.nextDouble() * 0.01; break;
            case 2010: basePrice = 0.1 + random.nextDouble() * 0.4; break;
            case 2011: basePrice = 1 + random.nextDouble() * 4; break;
            case 2012: basePrice = 5 + random.nextDouble() * 7; break;
            case 2013: basePrice = 100 + random.nextDouble() * 900; break;
            case 2014: basePrice = 300 + random.nextDouble() * 500; break;
            case 2015: basePrice = 200 + random.nextDouble() * 300; break;
            case 2016: basePrice = 400 + random.nextDouble() * 600; break;
            case 2017: basePrice = 1000 + random.nextDouble() * 19000; break;
            case 2018: basePrice = 3500 + random.nextDouble() * 6500; break;
            case 2019: basePrice = 3500 + random.nextDouble() * 4500; break;
            case 2020: basePrice = 5000 + random.nextDouble() * 25000; break;
            case 2021: basePrice = 30000 + random.nextDouble() * 39000; break;
            case 2022: basePrice = 16000 + random.nextDouble() * 9000; break;
            case 2023: basePrice = 25000 + random.nextDouble() * 20000; break;
            case 2024: basePrice = 40000 + random.nextDouble() * 25000; break;
            default: basePrice = 45000;
        }
        
        // Adicionar variação mensal
        double variation = (random.nextDouble() - 0.5) * 0.3; // ±15%
        return basePrice * (1 + variation);
    }

    @GetMapping("/bitcoin/historico")
    public ResponseEntity<?> getHistoricoBitcoin(@RequestParam(defaultValue = "30") int dias) {
        try {
            // Usar cache ou fallback para evitar rate limit
            return getHistoricoCompletoBitcoin();
        } catch (Exception e) {
            Map<String, Object> fallbackResult = criarDadosHistoricosFallback();
            return ResponseEntity.ok(fallbackResult);
        }
    }


    @GetMapping("/bitcoin/24h")
public ResponseEntity<?> getBitcoin24h() {
    try {
        String cacheKey = "bitcoin_24h";
        
        // Verificar cache (5 minutos)
        if (cache.containsKey(cacheKey) && (System.currentTimeMillis() - lastCacheUpdate) < 300000) {
            return ResponseEntity.ok(cache.get(cacheKey));
        }

        RestTemplate restTemplate = new RestTemplate();
        
        // API CoinGecko para dados das últimas 24h
        String url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly";
        
        Map<String, Object> resultado = new HashMap<>();
        
        try {
            Map response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && response.containsKey("prices")) {
                List<List<Double>> prices = (List<List<Double>>) response.get("prices");
                
                // Processar dados para o formato do frontend
                List<Map<String, Object>> processedData = new ArrayList<>();
                
                for (List<Double> pricePoint : prices) {
                    Map<String, Object> point = new HashMap<>();
                    point.put("timestamp", pricePoint.get(0));
                    point.put("price", pricePoint.get(1));
                    point.put("time", new Date(pricePoint.get(0).longValue()).toString());
                    point.put("priceFormatted", String.format("US$ %.2f", pricePoint.get(1)));
                    processedData.add(point);
                }
                
                resultado.put("success", true);
                resultado.put("data", processedData);
                resultado.put("currentPrice", prices.get(prices.size() - 1).get(1));
                resultado.put("change24h", calcularVariacao24h(prices));
                
            } else {
                throw new RuntimeException("Dados não encontrados");
            }
            
        } catch (Exception apiError) {
            System.out.println("API CoinGecko falhou, usando fallback: " + apiError.getMessage());
            resultado = criarDados24hFallback();
        }
        
        // Atualizar cache
        cache.put(cacheKey, resultado);
        lastCacheUpdate = System.currentTimeMillis();
        
        return ResponseEntity.ok(resultado);
        
    } catch (Exception e) {
        e.printStackTrace();
        Map<String, Object> fallbackResult = criarDados24hFallback();
        return ResponseEntity.ok(fallbackResult);
    }
}

private Double calcularVariacao24h(List<List<Double>> prices) {
    if (prices == null || prices.size() < 2) return 0.0;
    
    double primeiroPreco = prices.get(0).get(1);
    double ultimoPreco = prices.get(prices.size() - 1).get(1);
    
    return ((ultimoPreco - primeiroPreco) / primeiroPreco) * 100;
}

private Map<String, Object> criarDados24hFallback() {
    Map<String, Object> resultado = new HashMap<>();
    resultado.put("success", true);
    resultado.put("isFallback", true);
    
    List<Map<String, Object>> dados = new ArrayList<>();
    Calendar calendar = Calendar.getInstance();
    calendar.add(Calendar.HOUR, -24);
    
    double precoBase = 64500.0;
    Random random = new Random();
    
    // Gerar dados das últimas 24 horas (pontos horários)
    for (int i = 0; i < 24; i++) {
        calendar.add(Calendar.HOUR, 1);
        
        // Variação realista (±2%)
        double variacao = (random.nextDouble() - 0.5) * 0.04;
        double preco = precoBase * (1 + variacao);
        
        Map<String, Object> ponto = new HashMap<>();
        ponto.put("timestamp", calendar.getTimeInMillis());
        ponto.put("price", preco);
        ponto.put("time", String.format("%02d:00", calendar.get(Calendar.HOUR_OF_DAY)));
        ponto.put("priceFormatted", String.format("US$ %,.2f", preco));
        
        dados.add(ponto);
        
        // Atualizar preço base para próxima iteração
        precoBase = preco;
    }
    
    // Calcular variação 24h para dados fallback
    double primeiroPreco = (double) dados.get(0).get("price");
    double ultimoPreco = (double) dados.get(dados.size() - 1).get("price");
    double variacao = ((ultimoPreco - primeiroPreco) / primeiroPreco) * 100;
    
    resultado.put("data", dados);
    resultado.put("currentPrice", ultimoPreco);
    resultado.put("change24h", variacao);
    
    return resultado;
}
}