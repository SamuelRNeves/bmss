package com.bmss.backend.dto;

import com.bmss.backend.model.Item;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.format.DateTimeFormatter;

/**
 * DTO usado para enviar notícias e tweets ao frontend.
 * Compatível com os endpoints /noticias/ultimas, /noticias/tweets/ultimos e /noticias/filtrar.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedDTO {

    private String title;          // Título da notícia ou tweet resumido
    private String description;    // Descrição ou corpo completo
    private String url;            // URL da notícia ou tweet (fallback)
    private String source;         // Nome da fonte (Ex: "Cointelegraph", "Twitter")
    private String publishedAt;    // Data/hora de publicação
    private String sentimento;     // Sentimento final (positivo, neutro, negativo)
    private Double score;          // Pontuação de confiança (0–1)

    // 🔹 Campos adicionais
    private boolean isTweet;       // Verdadeiro se o item for um tweet
    private String tweetUrl;       // Link direto para o tweet (https://x.com/i/web/status/...)

    // ======================================================
    // 🔹 Conversor de Entidade → DTO
    // ======================================================
    public static FeedDTO fromEntity(Item item) {
        if (item == null) return null;

        // Formatar data
        String formattedDate = item.getPublishedAt() != null
                ? item.getPublishedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                : "";

        // Traduz sentimento para PT
        String sentimento = normalizeSentiment(item.getSentimentLabel());

        // Montar DTO
        return FeedDTO.builder()
                .title(item.getTitle())
                .description(item.getText())
                .url(item.getUrl())
                .source(item.getSourceName())
                .publishedAt(formattedDate)
                .sentimento(sentimento)
                .score(item.getSentimentScore())
                .isTweet(Boolean.TRUE.equals(item.getIsTweet()))
                .tweetUrl(item.getIsTweet() != null && item.getIsTweet()
                        ? "https://x.com/i/web/status/" + item.getTweetId()
                        : null)
                .build();
    }

    // ======================================================
    // 🔹 Conversor para Tweets (caso necessário)
    // ======================================================
    public static FeedDTO fromTweet(String text, String tweetUrl, String sentimento, Double score) {
        FeedDTO dto = new FeedDTO();
        dto.title = text.length() > 80 ? text.substring(0, 80) + "..." : text;
        dto.description = text;
        dto.url = tweetUrl;
        dto.source = "Twitter";
        dto.publishedAt = java.time.LocalDateTime.now().toString();
        dto.sentimento = sentimento;
        dto.score = score;
        dto.isTweet = true;
        dto.tweetUrl = tweetUrl;
        return dto;
    }

    // ======================================================
    // 🔹 Normaliza "positive" / "negative" / "neutral" → PT
    // ======================================================
    private static String normalizeSentiment(String label) {
        if (label == null) return "neutro";
        switch (label.toLowerCase()) {
            case "positive":
            case "positivo":
                return "positivo";
            case "negative":
            case "negativo":
                return "negativo";
            default:
                return "neutro";
        }
    }
}
