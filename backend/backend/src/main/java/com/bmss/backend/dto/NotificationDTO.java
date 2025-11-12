package com.bmss.backend.dto;

import com.bmss.backend.model.Item;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private String id;
    private String title;
    private String description;
    private String sentiment;
    private String category;
    private String source;
    private String url;
    private Double score;
    private String publishedAt;

    public static NotificationDTO fromItem(Item item) {
        if (item == null) {
            return null;
        }

        String category = Boolean.TRUE.equals(item.getIsTweet()) ? "tweet" : "news";
        String sentiment = normalizeSentiment(item.getSentimentLabel());

        String highlight = Optional.ofNullable(item.getTitle())
                .filter(value -> !value.isBlank())
                .orElseGet(() -> Optional.ofNullable(item.getText()).orElse("Atualização recente"));
        highlight = truncate(highlight, 160);

        String source = Optional.ofNullable(item.getSourceName())
                .filter(value -> !value.isBlank())
                .orElse(category.equals("tweet") ? "Twitter" : "Monitor externo");

        String description = buildDescriptor(sentiment, category, source, item.getSentimentScore());

        String url = Optional.ofNullable(item.getUrl())
                .filter(value -> !value.isBlank())
                .orElse(null);
        if (category.equals("tweet")) {
            url = Optional.ofNullable(item.getTweetId())
                    .filter(value -> !value.isBlank())
                    .map(tweetId -> "https://x.com/i/web/status/" + tweetId)
                    .orElse(url);
        }

        LocalDateTime published = item.getPublishedAt() != null ? item.getPublishedAt() : item.getCreatedAt();
        String publishedAt = Optional.ofNullable(published)
                .orElse(LocalDateTime.now())
                .format(ISO_FORMATTER);

        String identifier = Optional.ofNullable(item.getId())
                .map(String::valueOf)
                .map(id -> category + "-" + id)
                .orElse(category + "-" + publishedAt);

        return NotificationDTO.builder()
                .id(identifier)
                .title(highlight)
                .description(description)
                .sentiment(sentiment)
                .category(category)
                .source(source)
                .url(url)
                .score(item.getSentimentScore())
                .publishedAt(publishedAt)
                .build();
    }

    public static NotificationDTO summary(long total, double positive, double neutral, double negative) {
        double maxValue = Math.max(Math.max(positive, neutral), negative);
        String dominant;
        if (maxValue == positive && maxValue == negative && maxValue == neutral) {
            dominant = "neutral";
        } else if (maxValue == positive && maxValue == negative) {
            dominant = "neutral";
        } else if (maxValue == positive) {
            dominant = "positive";
        } else if (maxValue == negative) {
            dominant = "negative";
        } else {
            dominant = "neutral";
        }

        String title = switch (dominant) {
            case "positive" -> "Fluxo otimista domina as análises";
            case "negative" -> "Pressão negativa em destaque";
            default -> "Mercado equilibrado no curto prazo";
        };

        String description = String.format(
                Locale.ROOT,
                "Monitorando %d análises recentes: %.1f%% positivas, %.1f%% neutras e %.1f%% negativas.",
                total,
                sanitizePercentage(positive),
                sanitizePercentage(neutral),
                sanitizePercentage(negative)
        );

        return NotificationDTO.builder()
                .id("summary")
                .title(title)
                .description(description)
                .sentiment(dominant)
                .category("summary")
                .source("Monitor de Sentimento")
                .publishedAt(LocalDateTime.now().format(ISO_FORMATTER))
                .build();
    }

    public static NotificationDTO emptySummary() {
        return NotificationDTO.builder()
                .id("summary")
                .title("Aguardando análises de sentimento")
                .description("Assim que novas notícias e tweets forem processados, exibiremos alertas personalizados aqui.")
                .sentiment("neutral")
                .category("summary")
                .source("Monitor de Sentimento")
                .publishedAt(LocalDateTime.now().format(ISO_FORMATTER))
                .build();
    }

    private static double sanitizePercentage(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) {
            return 0.0;
        }
        return value;
    }

    private static String buildDescriptor(String sentiment, String category, String source, Double score) {
        String context = switch (sentiment) {
            case "positive" -> category.equals("tweet")
                    ? "Tweet indica humor positivo"
                    : "Notícia reforça sentimento positivo";
            case "negative" -> category.equals("tweet")
                    ? "Tweet aponta pressão negativa"
                    : "Notícia gera alerta negativo";
            default -> category.equals("tweet")
                    ? "Tweet com leitura neutra monitorada"
                    : "Notícia neutra acompanhada";
        };

        StringBuilder builder = new StringBuilder(context);
        builder.append(" • Fonte: ").append(source);

        if (score != null && !Double.isNaN(score)) {
            double percentual = Math.min(100.0, Math.max(0.0, Math.abs(score) * 100));
            builder.append(String.format(Locale.ROOT, " • Confiança %.0f%%", percentual));
        }

        return builder.toString();
    }

    private static String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, Math.max(0, maxLength - 3)).trim() + "...";
    }

    private static String normalizeSentiment(String label) {
        if (label == null) {
            return "neutral";
        }
        String normalized = label.trim().toLowerCase(Locale.ROOT);
        if (Objects.equals(normalized, "positive") || Objects.equals(normalized, "positivo")) {
            return "positive";
        }
        if (Objects.equals(normalized, "negative") || Objects.equals(normalized, "negativo")) {
            return "negative";
        }
        return "neutral";
    }
}
