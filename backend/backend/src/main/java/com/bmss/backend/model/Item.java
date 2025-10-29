package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    private String url;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "source_id")
    private Source source;

    @Column(name = "source")
    private String sourceName;

    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    // 🔹 Campos adicionados para Análise de Sentimento
    @Column(name = "sentiment_label")
    private String sentimentLabel;

    @Column(name = "sentiment_score")
    private Double sentimentScore;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    // 🔹 NOVOS CAMPOS PARA TWEETS (CRÍTICO!)
    @Column(name = "is_tweet")
    private Boolean isTweet = false;

    @Column(name = "tweet_id")
    private String tweetId;
}