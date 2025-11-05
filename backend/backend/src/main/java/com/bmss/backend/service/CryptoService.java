package com.bmss.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
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
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

@Service
public class CryptoService {

    private static final Logger log = LoggerFactory.getLogger(CryptoService.class);
    private static final String SYMBOL = "BTCUSDT";
    private static final List<String> BINANCE_API_BASES = List.of(
            "https://api.binance.com",
            "https://data.binance.com",
            "https://api1.binance.com",
            "https://api2.binance.com",
            "https://api3.binance.com"
    );
    private static final long DEFAULT_CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(15);
    private static final long PRICE_CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(1);
    private static final long PRICE24H_CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(5);
    private static final long HISTORY_SHORT_CACHE_DURATION_MS = TimeUnit.MINUTES.toMillis(10);
    private static final long HISTORY_MEDIUM_CACHE_DURATION_MS = TimeUnit.HOURS.toMillis(1);
    private static final long HISTORY_LONG_CACHE_DURATION_MS = TimeUnit.HOURS.toMillis(3);
    private static final long HISTORY_FULL_CACHE_DURATION_MS = TimeUnit.HOURS.toMillis(12);
    private static final String USER_AGENT = "BMSS-Backend/1.0 (+https://bmss-sytem.vercel.app)";
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;

    private final RestTemplate restTemplate;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final String coinGeckoApiKey;
    private final String coinGeckoHeaderName;
    private boolean coinGeckoWarningLogged = false;

    public CryptoService(RestTemplateBuilder restTemplateBuilder,
                         @Value("${COINGECKO_API_KEY:}") String coinGeckoApiKey,
                         @Value("${COINGECKO_API_KEY_HEADER:}") String coinGeckoApiKeyHeader) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(java.time.Duration.ofSeconds(10))
                .setReadTimeout(java.time.Duration.ofSeconds(10))
                .additionalInterceptors((request, body, execution) -> {
                    request.getHeaders().addIfAbsent(HttpHeaders.USER_AGENT, USER_AGENT);
                    request.getHeaders().addIfAbsent(HttpHeaders.ACCEPT, "application/json");
                    return execution.execute(request, body);
                })
                .build();
        this.coinGeckoApiKey = coinGeckoApiKey != null ? coinGeckoApiKey.trim() : "";
        this.coinGeckoHeaderName = resolveCoinGeckoHeaderName(coinGeckoApiKeyHeader, this.coinGeckoApiKey);
    }

    @PostConstruct
    public void primeCaches() {
        log.info("🚀 Priming Bitcoin caches...");
        refreshPriceCache();
        refresh24hCache();
        refreshHistoryCaches();
    }

    // ============================================================
    // 🔄 Atualizações frequentes dos caches principais
    // ============================================================
    @Scheduled(fixedDelay = 60000, initialDelay = 15000)
    public void refreshPriceCache() {
        refreshCache("price", this::buildPriceResponse, this::buildPriceFallbackResponse);
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 30000)
    public void refresh24hCache() {
        refreshCache("24h", this::build24hResponse, this::build24hFallbackResponse);
    }

    // ============================================================
    // 🔁 Atualização programada dos históricos mais pesados
    // ============================================================
    @Scheduled(cron = "0 0 6,12,18 * * *", zone = "America/Sao_Paulo")
    public void refreshHistoryCaches() {
        log.info("⏱️ Atualizando caches de histórico do Bitcoin...");
        refreshCache("history_30", () -> buildHistoryResponse(30), () -> buildHistoryFallbackResponse(30));
        refreshCache("history_365", () -> buildHistoryResponse(365), () -> buildHistoryFallbackResponse(365));
        refreshCache("history_full", this::buildFullHistoryResponse, () -> buildHistoryFallbackResponse(Integer.MAX_VALUE));
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
        return getOrFetch("history_full", this::buildFullHistoryResponse, () -> buildHistoryFallbackResponse(Integer.MAX_VALUE));
    }

    private Map<String, Object> getOrFetch(String key,
                                           Supplier<Map<String, Object>> fetcher,
                                           Supplier<Map<String, Object>> fallbackSupplier) {
        long now = System.currentTimeMillis();
        CacheEntry cached = cache.get(key);
        long cacheDuration = resolveCacheDuration(key);
        if (cached != null && now - cached.timestamp < cacheDuration) {
            return cached.payload;
        }

        try {
            Map<String, Object> response = wrapSuccess(fetcher.get(), false);
            cache.put(key, new CacheEntry(response, now));
            return response;
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar '{}': {}", key, ex.getMessage());
            if (cached != null) {
                log.info("♻️ Retornando valor em cache anterior para '{}' após falha na atualização.", key);
                return cached.payload;
            }

            Map<String, Object> response = wrapSuccess(fallbackSupplier.get(), true);
            cache.put(key, new CacheEntry(response, now));
            return response;
        }
    }

    private Map<String, Object> wrapSuccess(Map<String, Object> data, boolean fallback) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("isFallback", fallback || Boolean.TRUE.equals(data.get("isFallback")));
        Object timestamp = data.get("lastUpdated");
        if (timestamp == null) {
            timestamp = data.get("atualizado");
        }
        response.put("timestamp", timestamp != null ? timestamp : ISO_FORMATTER.format(Instant.now()));
        return response;
    }

    private long resolveCacheDuration(String key) {
        if ("price".equals(key)) {
            return PRICE_CACHE_DURATION_MS;
        }
        if ("24h".equals(key)) {
            return PRICE24H_CACHE_DURATION_MS;
        }
        if ("history_full".equals(key)) {
            return HISTORY_FULL_CACHE_DURATION_MS;
        }
        if (key != null && key.startsWith("history_")) {
            try {
                int days = Integer.parseInt(key.substring("history_".length()));
                if (days <= 30) {
                    return HISTORY_SHORT_CACHE_DURATION_MS;
                }
                if (days <= 180) {
                    return HISTORY_MEDIUM_CACHE_DURATION_MS;
                }
                return HISTORY_LONG_CACHE_DURATION_MS;
            } catch (NumberFormatException ignored) {
                return HISTORY_LONG_CACHE_DURATION_MS;
            }
        }
        return DEFAULT_CACHE_DURATION_MS;
    }

    // ============================================================
    // 🔹 Construção das respostas com dados reais (Binance)
    // ============================================================
    private Map<String, Object> buildPriceResponse() {
        Map<String, Object> ticker = fetchTicker();
        double lastPrice = toDouble(ticker.get("lastPrice"));
        double changePercent = toDouble(ticker.get("priceChangePercent"));
        long closeTime = toLong(ticker.get("closeTime"));

        Double usdToBrl = tryFetchUsdToBrl();
        Double priceBrl = usdToBrl != null ? lastPrice * usdToBrl : null;

        Map<String, Object> data = new HashMap<>();
        data.put("price", lastPrice);
        data.put("priceUSD", lastPrice);
        data.put("priceBRL", priceBrl);
        data.put("change24h", roundTwoDecimals(changePercent));
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

        Map<String, Object> ticker = fetchTicker();
        double lastPrice = toDouble(ticker.get("lastPrice"));
        double changePercent = toDouble(ticker.get("priceChangePercent"));
        long closeTime = toLong(ticker.get("closeTime"));
        Double usdToBrl = tryFetchUsdToBrl();

        List<Map<String, Object>> prices = new ArrayList<>();
        for (int i = 0; i < klines.size(); i++) {
            if (i % 3 != 0 && i != klines.size() - 1) { // amostragem para reduzir pontos
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
        data.put("change24h", roundTwoDecimals(changePercent));
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
        try {
            Map<String, Object> data = tryCoinGeckoPrice();
            log.info("✅ Utilizando dados de preço do fallback CoinGecko.");
            return data;
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar preço na CoinGecko: {}", ex.getMessage());
        }
        return buildStaticPriceFallbackResponse();
    }

    private Map<String, Object> buildStaticPriceFallbackResponse() {
        Map<String, Object> data = new HashMap<>();
        double fallbackPriceUsd = 64500.0;
        data.put("price", fallbackPriceUsd);
        data.put("priceUSD", fallbackPriceUsd);
        data.put("priceBRL", null);
        data.put("change24h", "0.00");
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        data.put("currency", "USD");
        data.put("priceFormatted", formatCurrency(fallbackPriceUsd, "USD"));
        data.put("priceFormattedBRL", null);
        data.put("source", "Fallback");
        data.put("isFallback", true);
        return data;
    }

    private Map<String, Object> build24hFallbackResponse() {
        try {
            Map<String, Object> data = tryCoinGecko24h();
            log.info("✅ Utilizando dados de 24h do fallback CoinGecko.");
            return data;
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar dados 24h na CoinGecko: {}", ex.getMessage());
        }
        return buildStatic24hFallbackResponse();
    }

    private Map<String, Object> buildStatic24hFallbackResponse() {
        Map<String, Object> data = new HashMap<>();
        List<Map<String, Object>> prices = new ArrayList<>();
        double basePrice = 64500.0;
        long now = System.currentTimeMillis();
        for (int i = 0; i < 24; i++) {
            double variation = (Math.random() - 0.5) * 0.04;
            double price = basePrice * (1 + variation);
            long timestamp = now - TimeUnit.HOURS.toMillis(24 - i);

            Map<String, Object> point = new HashMap<>();
            point.put("timestamp", timestamp);
            point.put("price", roundTwoDecimals(price));
            point.put("time", LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.of("America/Sao_Paulo"))
                    .format(DateTimeFormatter.ofPattern("HH:mm")));
            point.put("priceFormatted", formatCurrency(price, "USD"));
            prices.add(point);
        }
        data.put("prices", prices);
        data.put("currentPriceUSD", roundTwoDecimals(basePrice));
        data.put("currentPriceBRL", null);
        data.put("change24h", "0.00");
        data.put("source", "Fallback");
        data.put("isFallback", true);
        data.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        return data;
    }

    private Map<String, Object> buildHistoryFallbackResponse(int dias) {
        try {
            Map<String, Object> data = tryCoinGeckoHistory(dias);
            log.info("✅ Utilizando histórico do fallback CoinGecko ({} dias).", dias >= Integer.MAX_VALUE ? "max" : dias);
            return data;
        } catch (Exception ex) {
            log.warn("⚠️ Falha ao buscar histórico na CoinGecko: {}", ex.getMessage());
        }
        return buildStaticHistoryFallbackResponse();
    }

    private Map<String, Object> buildStaticHistoryFallbackResponse() {
        Map<String, Object> resultado = new HashMap<>();
        resultado.put("isFallback", true);

        List<List<Number>> prices = new ArrayList<>();
        List<List<Number>> volumes = new ArrayList<>();
        Random random = new Random();

        for (int year = 2009; year <= 2024; year++) {
            for (int month = 0; month < 12; month++) {
                if (year == 2024 && month > 9) {
                    break;
                }
                long timestamp = new GregorianCalendar(year, month, 1).getTimeInMillis();
                double price = calcularPrecoHistorico(year, month, random);
                double volume = 10_000_000 + random.nextDouble() * 50_000_000;
                prices.add(Arrays.asList(timestamp, price));
                volumes.add(Arrays.asList(timestamp, volume));
            }
        }

        resultado.put("prices", prices);
        resultado.put("total_volumes", volumes);
        resultado.put("lastUpdated", ISO_FORMATTER.format(Instant.now()));
        resultado.put("source", "Fallback");
        return resultado;
    }

    private double calcularPrecoHistorico(int year, int month, Random random) {
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
        double variation = (random.nextDouble() - 0.5) * 0.3;
        return basePrice * (1 + variation);
    }

    // ============================================================
    // 🔹 Utilidades
    // ============================================================
    private Map<String, Object> fetchTicker() {
        Map<String, Object> body = fetchFromBinance(
                "/api/v3/ticker/24hr?symbol=" + SYMBOL,
                Map.class
        );
        if (body == null || !body.containsKey("lastPrice")) {
            throw new IllegalStateException("Resposta inválida do ticker da Binance");
        }
        return body;
    }

    private Double tryFetchUsdToBrl() {
        try {
            Map<String, Object> body = restTemplate.getForObject(
                    "https://api.exchangerate.host/latest?base=USD&symbols=BRL",
                    Map.class
            );
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
        StringBuilder url = new StringBuilder("/api/v3/klines?symbol=")
                .append(SYMBOL)
                .append("&interval=").append(interval)
                .append("&limit=").append(limit);
        if (startTime != null) {
            url.append("&startTime=").append(startTime);
        }
        if (endTime != null) {
            url.append("&endTime=").append(endTime);
        }

        List<List<Object>> body = exchangeFromBinance(
                url.toString(),
                new ParameterizedTypeReference<List<List<Object>>>() {}
        );
        return body != null ? body : Collections.emptyList();
    }

    private <T> T fetchFromBinance(String pathWithQuery, Class<T> type) {
        IllegalStateException failure = null;
        for (String baseUrl : BINANCE_API_BASES) {
            try {
                T body = restTemplate.getForObject(baseUrl + pathWithQuery, type);
                if (body != null) {
                    return body;
                }
                log.warn("⚠️ Binance {} retornou corpo vazio para {}", baseUrl, pathWithQuery);
            } catch (Exception ex) {
                log.warn("⚠️ Falha ao chamar Binance {}{}: {}", baseUrl, pathWithQuery, ex.getMessage());
                if (failure == null) {
                    failure = new IllegalStateException("Falha ao chamar Binance: " + baseUrl + pathWithQuery, ex);
                } else {
                    failure.addSuppressed(ex);
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
        throw new IllegalStateException("A Binance retornou respostas vazias para " + pathWithQuery);
    }

    private <T> T exchangeFromBinance(String pathWithQuery, ParameterizedTypeReference<T> type) {
        IllegalStateException failure = null;
        for (String baseUrl : BINANCE_API_BASES) {
            try {
                ResponseEntity<T> response = restTemplate.exchange(
                        baseUrl + pathWithQuery,
                        HttpMethod.GET,
                        null,
                        type
                );
                T body = response.getBody();
                if (body != null) {
                    return body;
                }
                log.warn("⚠️ Binance {} retornou corpo vazio para {}", baseUrl, pathWithQuery);
            } catch (Exception ex) {
                log.warn("⚠️ Falha ao chamar Binance {}{}: {}", baseUrl, pathWithQuery, ex.getMessage());
                if (failure == null) {
                    failure = new IllegalStateException("Falha ao chamar Binance: " + baseUrl + pathWithQuery, ex);
                } else {
                    failure.addSuppressed(ex);
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
        throw new IllegalStateException("A Binance retornou respostas vazias para " + pathWithQuery);
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

    private Map<String, Object> tryCoinGeckoPrice() {
        String url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl&include_24hr_change=true&include_last_updated_at=true";

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildCoinGeckoHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("bitcoin")) {
                throw new IllegalStateException("Resposta inválida da CoinGecko");
            }

            Map<String, Object> bitcoin = (Map<String, Object>) body.get("bitcoin");
            double usdPrice = toDouble(bitcoin.get("usd"));
            Double brlPrice = bitcoin.get("brl") != null ? toDouble(bitcoin.get("brl")) : null;
            double change = bitcoin.get("usd_24h_change") != null ? toDouble(bitcoin.get("usd_24h_change")) : 0.0;
            long updatedAt = bitcoin.get("last_updated_at") != null ? TimeUnit.SECONDS.toMillis(toLong(bitcoin.get("last_updated_at"))) : System.currentTimeMillis();

            Map<String, Object> data = new HashMap<>();
            data.put("price", usdPrice);
            data.put("priceUSD", usdPrice);
            data.put("priceBRL", brlPrice);
            data.put("change24h", String.format(Locale.US, "%.2f", change));
            data.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(updatedAt)));
            data.put("currency", "USD");
            data.put("priceFormatted", formatCurrency(usdPrice, "USD"));
            data.put("priceFormattedBRL", brlPrice != null ? formatCurrency(brlPrice, "BRL") : null);
            data.put("source", "CoinGecko");
            data.put("isFallback", false);
            return data;
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 401) {
                throw new IllegalStateException("CoinGecko retornou 401 - configure sua chave de API.");
            }
            throw new IllegalStateException("CoinGecko: " + e.getStatusCode().value() + " - " + e.getStatusText());
        }
    }

    private Map<String, Object> tryCoinGecko24h() {
        String url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly";

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildCoinGeckoHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("prices")) {
                throw new IllegalStateException("Resposta inválida da CoinGecko");
            }

            List<List<Object>> pricesRaw = toObjectList(body.get("prices"));
            if (pricesRaw.isEmpty()) {
                throw new IllegalStateException("Histórico 24h vazio retornado pela CoinGecko");
            }

            int startIndex = Math.max(0, pricesRaw.size() - 24);
            List<Map<String, Object>> prices = new ArrayList<>();
            for (int i = startIndex; i < pricesRaw.size(); i++) {
                List<Object> entry = pricesRaw.get(i);
                long timestamp = toLong(entry.get(0));
                double price = toDouble(entry.get(1));

                Map<String, Object> point = new HashMap<>();
                point.put("timestamp", timestamp);
                point.put("price", roundTwoDecimals(price));
                point.put("time", LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.of("America/Sao_Paulo"))
                        .format(DateTimeFormatter.ofPattern("HH:mm")));
                point.put("priceFormatted", formatCurrency(price, "USD"));
                prices.add(point);
            }

            double firstPrice = toDouble(pricesRaw.get(startIndex).get(1));
            double lastPrice = toDouble(pricesRaw.get(pricesRaw.size() - 1).get(1));
            double changePercent = firstPrice != 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0.0;
            long lastTimestamp = toLong(pricesRaw.get(pricesRaw.size() - 1).get(0));

            Map<String, Object> data = new HashMap<>();
            data.put("prices", prices);
            data.put("currentPriceUSD", roundTwoDecimals(lastPrice));
            data.put("currentPriceBRL", null);
            data.put("change24h", String.format(Locale.US, "%.2f", changePercent));
            data.put("source", "CoinGecko");
            data.put("isFallback", false);
            data.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(lastTimestamp)));
            return data;
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 401) {
                throw new IllegalStateException("CoinGecko retornou 401 - configure sua chave de API.");
            }
            throw new IllegalStateException("CoinGecko: " + e.getStatusCode().value() + " - " + e.getStatusText());
        }
    }

    private Map<String, Object> tryCoinGeckoHistory(int dias) {
        String daysParam = dias >= Integer.MAX_VALUE ? "max" : String.valueOf(Math.max(dias, 1));
        String url = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=" + daysParam;

        try {
            HttpEntity<Void> request = new HttpEntity<>(buildCoinGeckoHeaders());
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("prices")) {
                throw new IllegalStateException("Resposta inválida da CoinGecko");
            }

            List<List<Object>> pricesRaw = toObjectList(body.get("prices"));
            if (pricesRaw.isEmpty()) {
                throw new IllegalStateException("Histórico vazio retornado pela CoinGecko");
            }

            List<List<Object>> volumesRaw = toObjectList(body.get("total_volumes"));
            Map<String, Object> payload = new HashMap<>();
            payload.put("prices", convertToNumberPairs(pricesRaw));
            if (!volumesRaw.isEmpty()) {
                payload.put("total_volumes", convertToNumberPairs(volumesRaw));
            }

            long lastTimestamp = toLong(pricesRaw.get(pricesRaw.size() - 1).get(0));
            payload.put("lastUpdated", ISO_FORMATTER.format(Instant.ofEpochMilli(lastTimestamp)));
            payload.put("source", "CoinGecko");
            payload.put("isFallback", false);
            return payload;
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 401) {
                throw new IllegalStateException("CoinGecko retornou 401 - configure sua chave de API.");
            }
            throw new IllegalStateException("CoinGecko: " + e.getStatusCode().value() + " - " + e.getStatusText());
        }
    }

    private HttpHeaders buildCoinGeckoHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Accept", "application/json");

        if (coinGeckoApiKey != null && !coinGeckoApiKey.isBlank()) {
            headers.add(coinGeckoHeaderName, coinGeckoApiKey);
        } else if (!coinGeckoWarningLogged) {
            log.warn("⚠️ COINGECKO_API_KEY não configurada. A CoinGecko pode retornar 401 Unauthorized.");
            coinGeckoWarningLogged = true;
        }

        return headers;
    }

    private String resolveCoinGeckoHeaderName(String configuredHeader, String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return "";
        }
        if (configuredHeader != null && !configuredHeader.isBlank()) {
            return configuredHeader.trim();
        }
        return apiKey.startsWith("CG-") ? "x-cg-demo-api-key" : "x-cg-pro-api-key";
    }

    private List<List<Object>> toObjectList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return Collections.emptyList();
        }
        List<List<Object>> converted = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof List<?> inner) {
                converted.add(new ArrayList<>(inner));
            }
        }
        return converted;
    }

    private List<List<Number>> convertToNumberPairs(List<List<Object>> rawPoints) {
        List<List<Number>> converted = new ArrayList<>();
        for (List<Object> point : rawPoints) {
            if (point.size() < 2) {
                continue;
            }
            long timestamp = toLong(point.get(0));
            double value = toDouble(point.get(1));
            converted.add(Arrays.asList(timestamp, value));
        }
        return converted;
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

    private static class CacheEntry {
        private final Map<String, Object> payload;
        private final long timestamp;

        CacheEntry(Map<String, Object> payload, long timestamp) {
            this.payload = payload;
            this.timestamp = timestamp;
        }
    }
}