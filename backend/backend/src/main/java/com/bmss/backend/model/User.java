package com.bmss.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.bmss.backend.model.InvestorProfile;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    // 🔐 senha com hash (não guarde texto puro)
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    @Column(name = "notification_preference")
    private String notificationPreference = "diario";

    // ✅ novo campo mapeado para investor_profile
    @Enumerated(EnumType.STRING)
    @Column(name = "investor_profile", nullable = false)
    private InvestorProfile investorProfile = InvestorProfile.MODERADO;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
