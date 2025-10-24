package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sentiments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sentiment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    private String label;
    private Double score;
    private String model;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
