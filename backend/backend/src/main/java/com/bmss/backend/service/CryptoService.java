package com.bmss.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Currency;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
public class CryptoService {

    private static final Logger log = LoggerFactory.getLogger(CryptoService.class);
    private static final String SYMBOL = "BTCUSDT";
    private static final long DAILY_CACHE_DURATION_MS = TimeUnit.HOURS.toMillis(24);
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

    private final RestTemplate restTemplate;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public CryptoService(RestTemplateBuilder restTemplateBuilder) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(java.time.Duration.ofSeconds(10))
                .setReadTimeout(java.time.Duration.ofSeconds(10))
                .build();
    }

    @PostConstruct
    public void primeCaches() {
        refreshDailyCaches();
    }

    // ============================================================
    // 🔄 Atualização agendada diariamente às 12h (horário de Brasília)
    // ============================================================
    @Scheduled(cron = "0 0 12 * * *", zone = "America/Sao_Paulo")
    public void refreshDailyCaches() {
        log.info("⏱️ Atualizando caches de dados do Bitcoin a partir da Binance...");
        refreshCache("price", this::buildPriceResponse, this::buildPriceFallbackResponse);
        refreshCache("24h", this::build24hResponse, this::build24hFallbackResponse);
        refreshCache("history_30", () -> buildHistoryResponse(30), () -> buildHistoryFallbackResponse(30));
        refreshCache("history_365", () -> buildHistoryResponse(365), () -> buildHistoryFallbackResponse(365));
        refreshCache("history_full", this::buildFullHistoryResponse, this::buildHistoryFallbackResponse);
    }

    private void refreshCache(String key, Supplier<Map<String, Object>> fetcher, Supplier<Map<String, Object>> fallback) {
        try {
            Map<String, Object> response = wrapSuccess(fetcher.get(), false);
            cache.put(key, new CacheEntry(response, System.currentTimeMillis()));
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao atualizar cache '{}': {}", key, ex.getMessage());
            CacheEntry existing = cache.get(key);
            if (existing != null) {
                log.info("♻️ Mantendo valor anterior do cache para '{}' após falha na atualização.", key);
                return;
            }

            Map<String, Object> fallbackResponse = wrapSuccess(fallback.get(), true);
            cache.put(key, new CacheEntry(fallbackResponse, System.currentTimeMillis()));
        }
    }

    // ============================================================
    // 🔹 Endpoints públicos
    // ============================================================
    public Map<String, Object> getBitcoinPrice() {
        return getOrFetch("price", this::buildPriceResponse, this::buildPriceFallbackResponse);
    }

    public Map<String, Object> getBitcoin24h() {
        return getOrFetch("24h", this::build24hResponse, this::build24hFallbackResponse);
    }

    public Map<String, Object> getBitcoinHistorico(int dias) {
        String cacheKey = "history_" + dias;
        return getOrFetch(cacheKey, () -> buildHistoryResponse(dias), () -> buildHistoryFallbackResponse(dias));
    }

    public Map<String, Object> getBitcoinHistoricoCompleto() {
        return getOrFetch("history_full", this::buildFullHistoryResponse, this::buildHistoryFallbackResponse);
    }

    private Map<String, Object> getOrFetch(String key,
                                           Supplier<Map<String, Object>> fetcher,
                                           Supplier<Map<String, Object>> fallbackSupplier) {
        long now = System.currentTimeMillis();
        CacheEntry cached = cache.get(key);
        boolean hasCached = cached != null;
        boolean cachedFallback = hasCached && isFallbackPayload(cached.payload);
        boolean cacheValid = hasCached && !cachedFallback && now - cached.timestamp < DAILY_CACHE_DURATION_MS;

        if (cacheValid) {
            return cached.payload;
        }

        try {
            Map<String, Object> response = wrapSuccess(fetcher.get(), false);
            cache.put(key, new CacheEntry(response, now));
            return response;
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar '{}': {}", key, ex.getMessage());
            if (hasCached) {
                log.info("♻️ Retornando valor em cache anterior para '{}' após falha na atualização.", key);
                return cached.payload;
            }

            Map<String, Object> response = wrapSuccess(fallbackSupplier.get(), true);
            cache.put(key, new CacheEntry(response, now));
            return response;
        }
    }

    private Map<String, Object> wrapSuccess(Map<String, Object> data, boolean fallback) {
        // Resolvendo o conflito: combinar as duas abordagens
        boolean isFallback = fallback || toBoolean(data.get("isFallback"));
        data.put("isFallback", isFallback);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("isFallback", isFallback);
        
        Object timestamp = data.get("lastUpdated");
        if (timestamp == null) {
            timestamp = data.get("atualizado");
        }
        response.put("timestamp", timestamp != null ? timestamp : ISO_FORMATTER.format(Instant.now()));
        return response;
    }

    // ============================================================
    // 🔹 Construção das respostas com dados reais (Binance)
    // ============================================================
    private Map<String, Object> buildPriceResponse() {
        Map<String, Object> currentPriceTicker = fetchCurrentPriceTicker();
        Map<String, Object> ticker24h = fetch24hTicker();

        double lastPrice = toDouble(currentPriceTicker.get("price"));
        double changePercent = toDouble(ticker24h.get("priceChangePercent"));
        long closeTime = toLong(ticker24h.get("closeTime"));

        Double usdToBrl = tryFetchUsdToBrl();
        Double priceBrl = usdToBrl != null ? lastPrice * usdToBrl : null;

        Map<String, Object> data = new HashMap<>();
        data.put("price", lastPrice);
        data.put("priceUSD", lastPrice);
        data.put("priceBRL", priceBrl);
        data.put("change24h", String.format(Locale.US, "%.2f", changePercent));
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(closeTime)));
        data.put("currency", "USD");
        data.put("priceFormatted", formatCurrency(lastPrice, "USD"));
        data.put("priceFormattedBRL", priceBrl != null ? formatCurrency(priceBrl, "BRL") : null);
        data.put("source", "Binance");
        data.put("isFallback", false);
        return data;
    }

    private Map<String, Object> build24hResponse() {
        List<List<Object>> klines = fetchKlines("5m", 288, null, null);
        if (klines.isEmpty()) {
            throw new IllegalStateException("Nenhum candle retornado pela Binance");
        }

        Map<String, Object> ticker = fetch24hTicker();
        double lastPrice = toDouble(ticker.get("lastPrice"));
        double changePercent = toDouble(ticker.get("priceChangePercent"));
        long closeTime = toLong(ticker.get("closeTime"));
        Double usdToBrl = tryFetchUsdToBrl();

        List<Map<String, Object>> prices = new ArrayList<>();
        for (int i = 0; i < klines.size(); i++) {
            if (i % 3 != 0 && i != klines.size() - 1) {
                continue;
            }
            List<Object> candle = klines.get(i);
            long openTime = toLong(candle.get(0));
            double close = toDouble(candle.get(4));

            Map<String, Object> point = new HashMap<>();
            point.put("timestamp", openTime);
            point.put("price", roundTwoDecimals(close));
            point.put("time", LocalDateTime.ofInstant(Instant.ofEpochMilli(openTime), ZoneId.of("America/Sao_Paulo"))
                    .format(DateTimeFormatter.ofPattern("HH:mm")));
            point.put("priceFormatted", formatCurrency(close, "USD"));
            prices.add(point);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("prices", prices);
        data.put("currentPriceUSD", roundTwoDecimals(lastPrice));
        data.put("currentPriceBRL", usdToBrl != null ? roundTwoDecimals(lastPrice * usdToBrl) : null);
        data.put("change24h", String.format(Locale.US, "%.2f", changePercent));
        data.put("source", "Binance");
        data.put("isFallback", false);
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(closeTime)));
        return data;
    }

    private Map<String, Object> buildHistoryResponse(int dias) {
        String interval;
        int limit;
        if (dias <= 30) {
            interval = "1h";
            limit = Math.min(dias * 24, 1000);
        } else if (dias <= 120) {
            interval = "4h";
            limit = Math.min(dias * 6, 1000);
        } else {
            interval = "1d";
            limit = Math.min(dias, 1000);
        }

        List<List<Object>> klines = fetchKlines(interval, limit, computeStartTime(limit, interval), null);
        if (klines.isEmpty()) {
            throw new IllegalStateException("Histórico vazio retornado pela Binance");
        }

        Map<String, Object> chart = buildMarketChartPayload(klines);
        chart.put("source", "Binance");
        chart.put("isFallback", false);
        return chart;
    }

    private Map<String, Object> buildFullHistoryResponse() {
        long endTime = System.currentTimeMillis();
        long startTime = new GregorianCalendar(2017, GregorianCalendar.AUGUST, 17).getTimeInMillis();

        List<List<Object>> allKlines = new ArrayList<>();
        long cursor = startTime;
        while (cursor < endTime) {
            List<List<Object>> batch = fetchKlines("1d", 1000, cursor, endTime);
            if (batch.isEmpty()) {
                break;
            }
            allKlines.addAll(batch);
            long lastClose = toLong(batch.get(batch.size() - 1).get(6));
            cursor = lastClose + 1;
            if (batch.size() < 1000) {
                break;
            }
        }

        if (allKlines.isEmpty()) {
            throw new IllegalStateException("Histórico completo não disponível");
        }

        Map<String, Object> chart = buildMarketChartPayload(allKlines);
        chart.put("source", "Binance");
        chart.put("isFallback", false);
        return chart;
    }

    // ============================================================
    // 🔹 Fallbacks
    // ============================================================
    private Map<String, Object> buildPriceFallbackResponse() {
        Map<String, Object> data = new HashMap<>();
        data.put("price", null);
        data.put("priceUSD", null);
        data.put("priceBRL", null);
        data.put("change24h", null);
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        data.put("currency", "USD");
        data.put("priceFormatted", null);
        data.put("priceFormattedBRL", null);
        data.put("source", "Fallback");
        data.put("isFallback", true);
        return data;
    }

    private Map<String, Object> build24hFallbackResponse() {
        Map<String, Object> data = new HashMap<>();
        data.put("prices", Collections.emptyList());
        data.put("currentPriceUSD", null);
        data.put("currentPriceBRL", null);
        data.put("change24h", null);
        data.put("source", "Fallback");
        data.put("isFallback", true);
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        return data;
    }

    private Map<String, Object> buildHistoryFallbackResponse(int dias) {
        return buildHistoryFallbackResponse();
    }

    private Map<String, Object> buildHistoryFallbackResponse() {
        Map<String, Object> resultado = new HashMap<>();
        resultado.put("prices", Collections.emptyList());
        resultado.put("total_volumes", Collections.emptyList());
        resultado.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        resultado.put("source", "Fallback");
        resultado.put("isFallback", true);
        return resultado;
    }

    // ============================================================
    // 🔹 Utilidades
    // ============================================================
    private Map<String, Object> fetchCurrentPriceTicker() {
        String url = "https://api.binance.com/api/v3/ticker/price?symbol=" + SYMBOL;
        log.info("➡️ Iniciando chamada HTTP GET para {}", url);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);
        log.info("✅ Chamada concluída para {} com status {}", url, response.getStatusCode());

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("price")) {
            throw new IllegalStateException("Resposta inválida do preço atual da Binance");
        }
        return body;
    }

    private Map<String, Object> fetch24hTicker() {
        String url = "https://api.binance.com/api/v3/ticker/24hr?symbol=" + SYMBOL;
        log.info("➡️ Iniciando chamada HTTP GET para {}", url);
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);
        log.info("✅ Chamada concluída para {} com status {}", url, response.getStatusCode());

        Map<String, Object> body = response.getBody();
        if (body == null || !body.containsKey("lastPrice")) {
            throw new IllegalStateException("Resposta inválida do ticker 24h da Binance");
        }
        return body;
    }

    private Double tryFetchUsdToBrl() {
        try {
            String url = "https://api.exchangerate.host/latest?base=USD&symbols=BRL";
            log.info("➡️ Iniciando chamada HTTP GET para {}", url);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, null, Map.class);
            log.info("✅ Chamada concluída para {} com status {}", url, response.getStatusCode());

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("rates")) {
                throw new IllegalStateException("Resposta inválida da taxa de câmbio");
            }
            Map<String, Object> rates = (Map<String, Object>) body.get("rates");
            Object rate = rates.get("BRL");
            if (rate == null) {
                throw new IllegalStateException("Taxa USD/BRL não encontrada");
            }
            return toDouble(rate);
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar taxa USD/BRL: {}", ex.getMessage());
            return null;
        }
    }

    private List<List<Object>> fetchKlines(String interval, int limit, Long startTime, Long endTime) {
        StringBuilder url = new StringBuilder("https://api.binance.com/api/v3/klines?symbol=")
                .append(SYMBOL)
                .append("&interval=").append(interval)
                .append("&limit=").append(limit);
        if (startTime != null) {
            url.append("&startTime=").append(startTime);
        }
        if (endTime != null) {
            url.append("&endTime=").append(endTime);
        }

        String finalUrl = url.toString();
        log.info("➡️ Iniciando chamada HTTP GET para {}", finalUrl);
        ResponseEntity<List<List<Object>>> response = restTemplate.exchange(
                finalUrl,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<List<Object>>>() {}
        );
        log.info("✅ Chamada concluída para {} com status {}", finalUrl, response.getStatusCode());
        List<List<Object>> body = response.getBody();
        return body != null ? body : Collections.emptyList();
    }

    private Map<String, Object> buildMarketChartPayload(List<List<Object>> klines) {
        List<List<Number>> prices = new ArrayList<>();
        List<List<Number>> volumes = new ArrayList<>();

        for (List<Object> candle : klines) {
            long openTime = toLong(candle.get(0));
            double close = toDouble(candle.get(4));
            double volume = toDouble(candle.get(5));
            prices.add(Arrays.asList(openTime, close));
            volumes.add(Arrays.asList(openTime, volume));
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("prices", prices);
        payload.put("total_volumes", volumes);
        long lastClose = toLong(klines.get(klines.size() - 1).get(6));
        payload.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(lastClose)));
        return payload;
    }

    private Long computeStartTime(int limit, String interval) {
        long now = System.currentTimeMillis();
        switch (interval) {
            case "1h":
                return now - TimeUnit.HOURS.toMillis(limit);
            case "4h":
                return now - TimeUnit.HOURS.toMillis(limit * 4L);
            case "1d":
            default:
                return now - TimeUnit.DAYS.toMillis(limit);
        }
    }

    private String formatCurrency(double value, String currencyCode) {
        Locale locale = new Locale("pt", "BR");
        java.text.NumberFormat formatter = java.text.NumberFormat.getCurrencyInstance(locale);
        formatter.setCurrency(Currency.getInstance(currencyCode));
        return formatter.format(value);
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return Double.parseDouble(String.valueOf(value));
    }

    private long toLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    @SuppressWarnings("unchecked")
    private boolean isFallbackPayload(Map<String, Object> payload) {
        if (payload == null) {
            return false;
        }
        if (toBoolean(payload.get("isFallback"))) {
            return true;
        }
        Object data = payload.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            Object nested = ((Map<String, Object>) dataMap).get("isFallback");
            return toBoolean(nested);
        }
        return false;
    }

    private boolean toBoolean(Object value) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private static class CacheEntry {
        private final Map<String, Object> payload;
        private final long timestamp;

        CacheEntry(Map<String, Object> payload, long timestamp) {
            this.payload = payload;
            this.timestamp = timestamp;
        }
    }
}