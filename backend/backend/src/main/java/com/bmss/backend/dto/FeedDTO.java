package com.bmss.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO usado para enviar notícias e tweets ao frontend.
 * Compatível com os endpoints /noticias/ultimas e /noticias/tweets/ultimos.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedDTO {

    private String title;          // Título da notícia ou tweet resumido
    private String description;    // Descrição ou corpo completo
    private String url;            // URL da notícia ou tweet (fallback)
    private String source;         // Nome da fonte (Ex: "Cointelegraph", "Twitter")
    private String publishedAt;    // Data/hora de publicação
    private String sentimento;     // Sentimento final (positive, neutral, negative)
    private Double score;          // Pontuação de confiança (0–1)

    // 🔹 Campos adicionais
    private boolean isTweet;       // Verdadeiro se o item for um tweet
    private String tweetUrl;       // Link direto para o tweet (https://x.com/i/web/status/...)

    // Construtor simplificado para notícias comuns
    public FeedDTO(String title, String description, String url, String source, String publishedAt, String sentimento, Double score) {
        this.title = title;
        this.description = description;
        this.url = url;
        this.source = source;
        this.publishedAt = publishedAt;
        this.sentimento = sentimento;
        this.score = score;
        this.isTweet = false;
        this.tweetUrl = null;
    }

    // Construtor para tweets
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
}
