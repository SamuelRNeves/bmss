package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "notification_preference")
    private String notificationPreference = "diario";

    @Lob
    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    // ENUM DENTRO DA CLASSE → Lombok vê e gera getter
    public enum InvestorProfile {
        CONSERVADOR,
        MODERADO,
        AGRESSIVO
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "investor_profile", nullable = false)
    private InvestorProfile investorProfile = InvestorProfile.MODERADO;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}