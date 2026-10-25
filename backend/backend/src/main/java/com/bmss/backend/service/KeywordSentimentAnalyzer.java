package com.bmss.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * Análise de sentimento por palavras-chave, portada do microserviço Python
 * (backend/bmss-sentiment/app.py) sem o modelo de IA.
 *
 * Mantém as mesmas listas, pesos e regras do Python para que os resultados
 * sejam idênticos aos da versão leve do serviço (BMSS_DISABLE_MODEL=1):
 *  - notícias  -> forced_analysis()
 *  - tweets    -> analyze_tweet_final()
 *
 * Observação: algumas frases das listas originais têm letras maiúsculas
 * (ex.: "ETF aprovado", "CEO") e, como o texto é comparado em minúsculas,
 * nunca casam — o comportamento foi mantido igual ao original de propósito.
 */
@Component
public class KeywordSentimentAnalyzer {

    // ======================================================
    // Notícias
    // ======================================================
    private static final Set<String> POSITIVE_SUPER_STRONG = Set.of(
            "us$ 1 milhão", "1 milhão de dólares", "bitcoin para us$ 1 milhão",
            "previsão de us$ 1 milhão", "alvo de us$ 1 milhão", "us$ 1.000.000",
            "corrida do bitcoin", "corrida para us$ 1 milhão", "disparada do bitcoin",
            "explosão do bitcoin", "valorização recorde", "máxima histórica",
            "novo recorde histórico", "alta espetacular", "valorização explosiva",
            "lucro milionário", "ganhos extraordinários", "retorno extraordinário",
            "oportunidade única", "potencial máximo", "cenário extremamente positivo"
    );

    private static final Set<String> POSITIVE_STRONG = Set.of(
            "previsão otimista", "perspectiva positiva", "cenário favorável",
            "mercado em alta", "tendência de valorização", "potencial de alta",
            "bull market", "mercado bullish", "otimismo no mercado",
            "alta do bitcoin", "valorização do bitcoin", "bitcoin valoriza",
            "bitcoin sobe", "bitcoin dispara", "bitcoin explode",
            "adoção institucional", "empresas comprando", "ETF aprovado",
            "Tesla bitcoin", "MicroStrategy", "Square bitcoin", "PayPal bitcoin",
            "investimento institucional", "Wall Street", "bancos comprando",
            "halving positivo", "mineração lucrativa", "tecnologia disruptiva",
            "ouro digital", "reserva de valor", "proteção contra inflação",
            "hedge inflacionário", "ativo deflacionário", "escassez digital"
    );

    private static final Set<String> POSITIVE_MEDIUM = Set.of(
            "alto", "alta", "subir", "subindo", "valorizar", "valorização", "crescer",
            "crescimento", "lucro", "ganho", "rendimento", "retorno", "bull", "bullish",
            "record", "recorde", "disparar", "explodir", "forte", "fortalecer",
            "otimista", "otimismo", "compra", "comprar", "investir", "oportunidade",
            "potencial", "positivo", "bom", "excelente", "fantástico", "incrível",
            "maravilhoso", "ótimo", "benefício", "vantagem", "sucesso", "vencedor",
            "ganhador", "milhão", "milhões", "bilhão", "bilhões", "trilhão",
            "valorizar muito", "subir muito", "crescer muito", "lucro alto"
    );

    private static final Set<String> NEGATIVE_STRONG = Set.of(
            "queda do bitcoin", "bitcoin despenca", "bitcoin cai", "crash do bitcoin",
            "colapso do bitcoin", "quebra do mercado", "bolha do bitcoin",
            "fraude do bitcoin", "scam do bitcoin", "pirâmide financeira",
            "golpe do bitcoin", "proibição do bitcoin", "banimento do bitcoin",
            "regulamentação restritiva", "governo proíbe", "ilegalidade do bitcoin",
            "hackeamento de exchange", "roubo de bitcoin", "perda total",
            "prejuízo milionário", "perdas financeiras", "risco extremo",
            "alto risco", "perigoso", "especulação perigosa", "alerta de risco",
            "cuidado extremo", "mercado em pânico", "pânico no mercado"
    );

    private static final Set<String> NEGATIVE_MEDIUM = Set.of(
            "baixo", "baixa", "cair", "caindo", "desvalorizar", "desvalorização",
            "queda", "quebra", "perda", "prejuízo", "risco", "perigoso", "bear",
            "bearish", "colapso", "crash", "bolha", "fraude", "scam", "pirâmide",
            "golpe", "proibição", "ban", "regulamentação", "hack", "hackeado",
            "roubo", "perdido", "medo", "incerteza", "volátil", "instável",
            "especulação", "alerta", "cuidado", "venda", "vendendo", "negativo",
            "ruim", "péssimo", "horrível", "terrível", "problema", "preocupação"
    );

    private static final List<String> FORECAST_WORDS = List.of("previsão", "preveem", "projeção", "alvo");
    private static final List<String> FORECAST_UP_WORDS = List.of("alto", "alta", "subir", "valorizar", "milhão", "bilhão");
    private static final List<String> INSTITUTION_WORDS = List.of("executivo", "CEO", "diretor", "presidente", "empresa", "instituição");
    private static final List<String> INSTITUTION_POSITIVE_WORDS = List.of("compra", "investe", "otimista", "positivo");

    private static final Pattern HIGH_NUMBERS = Pattern.compile(
            "US?\\$?\\s*(\\d+[\\.,]?\\d*\\s*(mil|milh[oõ]es|bilh[oõ]es))");

    // ======================================================
    // Tweets
    // ======================================================
    private static final List<String> BITCOIN_MENTIONS = List.of(
            "bitcoin", "btc", "#bitcoin", "bitcoin halving", "bitcoin mining",
            "bitcoin wallet", "bitcoin address", "mine bitcoin", "buy bitcoin"
    );

    private static final Set<String> POSITIVE_EMOJIS = Set.of(
            "🚀", "💎", "🔥", "🎯", "📈", "⭐", "🌟", "✨", "💪", "🥳", "🤑", "💰", "🎉");
    private static final Set<String> NEGATIVE_EMOJIS = Set.of(
            "💩", "😰", "📉", "👎", "💔", "😞", "😢", "⚠️", "🔻", "😨", "🤮", "☠️");

    private static final Map<String, Integer> TWEET_SUPER_POSITIVE = Map.ofEntries(
            Map.entry("to the moon", 10), Map.entry("moon soon", 8), Map.entry("buy the dip", 6),
            Map.entry("diamond hands", 6), Map.entry("never selling", 5), Map.entry("hodl strong", 5),
            Map.entry("bull run", 5), Map.entry("breaking out", 4), Map.entry("massive pump", 4),
            Map.entry("going parabolic", 4), Map.entry("lambo", 4), Map.entry("wealth", 3),
            Map.entry("get rich", 3), Map.entry("financial freedom", 3), Map.entry("revolution", 3),
            Map.entry("future", 2), Map.entry("upgrade the world", 5), Map.entry("revolutionizing", 4),
            Map.entry("mine bitcoin", 3)
    );

    private static final Set<String> TWEET_POSITIVE_WORDS = Set.of(
            "bullish", "bull", "buy", "buying", "accumulate", "hodl", "hold",
            "profit", "gain", "win", "winning", "green", "pump", "pumping",
            "surge", "soaring", "breaking", "record", "massive", "huge",
            "enormous", "incredible", "amazing", "awesome", "perfect", "great",
            "good", "nice", "excellent", "fantastic", "love", "loving", "uptrend",
            "help", "upgrade", "revolution", "revolutionizing", "mine", "mining",
            "confident", "confidence", "secure", "security", "iron-tight"
    );

    private static final Set<String> POSITIVE_HASHTAGS = Set.of(
            "bitcoin", "btc", "crypto", "cryptocurrency", "blockchain",
            "hodl", "tothemoon", "bullish", "buybitcoin", "bitcoinmining",
            "cryptosafe", "margex"
    );

    private static final List<String> HELP_PHRASES = List.of(
            "help upgrade", "upgrade the world", "help with", "bless you",
            "clear bills", "clear debt", "make money", "earn money"
    );

    private static final List<String> SECURITY_PHRASES = List.of(
            "total confidence", "iron-tight", "security", "secure", "safe",
            "trust", "reliable"
    );

    private static final List<String> SURVIVAL_PHRASES = List.of(
            "don't die", "stay alive", "survive", "living", "alive"
    );

    private static final Set<String> TWEET_NEGATIVE_WORDS = Set.of(
            "die", "dead", "death", "scam", "fraud", "rug", "pull", "rekt",
            "crash", "crashing", "collapse", "bear", "bearish", "red", "loss",
            "losing", "dump", "dumping", "sell", "selling", "panic", "fud",
            "fear", "warning", "danger", "risk", "careful", "avoid", "bad",
            "terrible", "awful", "horrible", "burn", "shit", "garbage", "trash",
            "worst", "fail", "failure", "problem", "trouble", "concern", "debt"
    );

    private static final Pattern HASHTAG = Pattern.compile("#(\\w+)", Pattern.UNICODE_CHARACTER_CLASS);

    // ======================================================
    // API pública (mesmo formato de resposta do Flask)
    // ======================================================

    /** Equivalente ao POST /analyze-batch do Flask. */
    public List<Map<String, Object>> analyzeNews(List<String> texts) {
        List<Map<String, Object>> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(analyzeNewsText(text == null ? "" : text));
        }
        return results;
    }

    /** Equivalente ao POST /analyze-tweets do Flask. */
    public List<Map<String, Object>> analyzeTweets(List<String> texts) {
        List<Map<String, Object>> results = new ArrayList<>(texts.size());
        for (String text : texts) {
            results.add(analyzeTweetText(text == null ? "" : text));
        }
        return results;
    }

    // ======================================================
    // forced_analysis() sem modelo
    // ======================================================
    Map<String, Object> analyzeNewsText(String text) {
        String lower = text.toLowerCase(Locale.ROOT);

        int positive = 0;
        int negative = 0;
        for (String p : POSITIVE_SUPER_STRONG) if (lower.contains(p)) positive += 10;
        for (String p : POSITIVE_STRONG) if (lower.contains(p)) positive += 5;
        for (String p : POSITIVE_MEDIUM) if (lower.contains(p)) positive += 2;
        for (String p : NEGATIVE_STRONG) if (lower.contains(p)) negative += 5;
        for (String p : NEGATIVE_MEDIUM) if (lower.contains(p)) negative += 2;

        int boosts = 0;
        if (containsAny(lower, FORECAST_WORDS) && containsAny(lower, FORECAST_UP_WORDS)) boosts += 3;
        if (containsAny(lower, INSTITUTION_WORDS) && containsAny(lower, INSTITUTION_POSITIVE_WORDS)) boosts += 3;
        if (HIGH_NUMBERS.matcher(lower).find()) boosts += 2;
        positive += boosts;

        int finalScore = positive - negative;

        String sentiment;
        double confidence;
        if (finalScore >= 3) {
            sentiment = "positive";
            confidence = Math.min(0.95, 0.7 + (finalScore * 0.05));
        } else if (finalScore <= -3) {
            sentiment = "negative";
            confidence = Math.min(0.95, 0.7 + (Math.abs(finalScore) * 0.05));
        } else {
            sentiment = "neutral";
            confidence = 0.5;
        }

        boolean hasSuperPositive = containsAny(lower, POSITIVE_SUPER_STRONG);
        if (hasSuperPositive) {
            sentiment = "positive";
            confidence = Math.max(confidence, 0.9);
        }

        // Palavras-chave fortes: usa direto a confiança das palavras-chave
        if (hasSuperPositive || Math.abs(finalScore) >= 5) {
            return result(sentiment, confidence);
        }

        // Sem modelo: o "modelo" é sempre neutral/0.5, com peso de 20%
        double combined;
        String label;
        if ("positive".equals(sentiment) || "negative".equals(sentiment)) {
            combined = confidence * 0.8; // + 0 do modelo neutro
            label = sentiment;
        } else {
            combined = 0.5;
            label = "neutral";
        }
        return result(label, round3(combined));
    }

    // ======================================================
    // analyze_tweet_final()
    // ======================================================
    Map<String, Object> analyzeTweetText(String text) {
        String lower = text.toLowerCase(Locale.ROOT);

        int positive = 0;
        int negative = 0;

        for (String m : BITCOIN_MENTIONS) if (lower.contains(m)) positive += 2;
        for (String e : POSITIVE_EMOJIS) positive += countOccurrences(text, e) * 5;
        for (String e : NEGATIVE_EMOJIS) negative += countOccurrences(text, e) * 5;
        for (Map.Entry<String, Integer> p : TWEET_SUPER_POSITIVE.entrySet()) {
            if (lower.contains(p.getKey())) positive += p.getValue();
        }
        for (String w : TWEET_POSITIVE_WORDS) if (lower.contains(w)) positive += 2;

        Matcher tags = HASHTAG.matcher(lower);
        while (tags.find()) {
            if (POSITIVE_HASHTAGS.contains(tags.group(1))) positive += 3;
        }

        for (String p : HELP_PHRASES) if (lower.contains(p)) positive += 3;
        for (String p : SECURITY_PHRASES) if (lower.contains(p)) positive += 2;
        for (String p : SURVIVAL_PHRASES) if (lower.contains(p)) positive += 4;
        for (String w : TWEET_NEGATIVE_WORDS) if (lower.contains(w)) negative += 3;

        int finalScore = positive - negative;

        String sentiment;
        double confidence;
        if (finalScore >= 1) {
            sentiment = "positive";
            confidence = Math.min(0.95, 0.6 + (finalScore * 0.1));
        } else if (finalScore <= -1) {
            sentiment = "negative";
            confidence = Math.min(0.95, 0.6 + (Math.abs(finalScore) * 0.1));
        } else {
            sentiment = "neutral";
            confidence = 0.5;
        }

        if (containsAny(text, POSITIVE_EMOJIS)) {
            sentiment = "positive";
            confidence = Math.max(confidence, 0.85);
        }
        if (containsAny(text, NEGATIVE_EMOJIS)) {
            sentiment = "negative";
            confidence = Math.max(confidence, 0.85);
        }

        boolean hasBitcoinMention = containsAny(lower, BITCOIN_MENTIONS);
        boolean hasPositiveContext = positive > 2;
        if (hasBitcoinMention && hasPositiveContext) {
            sentiment = "positive";
            confidence = Math.max(confidence, 0.8);
        }
        if (hasBitcoinMention && negative == 0 && "neutral".equals(sentiment)) {
            sentiment = "positive";
            confidence = 0.7;
        }

        int emojiCount = countOccurrences(text, "🚀") + countOccurrences(text, "💎")
                + countOccurrences(text, "🔥") + countOccurrences(text, "🎯");

        if (!"neutral".equals(sentiment) || hasBitcoinMention || emojiCount > 0) {
            return result(sentiment, confidence);
        }
        if (lower.contains("bitcoin") || lower.contains("btc")) {
            return result("positive", 0.7);
        }
        return result("neutral", 0.5);
    }

    // ======================================================
    // Utilitários
    // ======================================================
    private static boolean containsAny(String text, Iterable<String> needles) {
        for (String n : needles) {
            if (text.contains(n)) return true;
        }
        return false;
    }

    /** Ocorrências sem sobreposição, como str.count() do Python. */
    private static int countOccurrences(String text, String needle) {
        int count = 0;
        int from = 0;
        while ((from = text.indexOf(needle, from)) != -1) {
            count++;
            from += needle.length();
        }
        return count;
    }

    /** Mesmo arredondamento do round(x, 3) do Python. */
    private static double round3(double value) {
        return new BigDecimal(value).setScale(3, RoundingMode.HALF_EVEN).doubleValue();
    }

    private static Map<String, Object> result(String label, double score) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("label", label);
        map.put("score", score);
        return map;
    }
}
