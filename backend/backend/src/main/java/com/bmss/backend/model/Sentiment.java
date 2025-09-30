package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sentiments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Sentiment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    private String label;      // POSITIVE | NEGATIVE | NEUTRAL
    private BigDecimal score;  // 0.0–1.0
    private String model;      // modelo de IA utilizado

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}

