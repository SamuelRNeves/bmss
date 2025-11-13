package com.bmss.backend.model;

import com.bmss.backend.security.PasswordHashUtils;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @JsonIgnore
    @Column(name = "password_hash")
    private String passwordHash;

    @JsonIgnore
    @Transient
    private String legacyPassword;

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

    @JsonIgnore
    public String getResolvedPasswordHash() {
        if (PasswordHashUtils.isLikelyUsablePassword(passwordHash)) {
            return passwordHash.trim();
        }
        if (PasswordHashUtils.isLikelyUsablePassword(legacyPassword)) {
            return legacyPassword.trim();
        }
        return null;
    }

    @JsonIgnore
    public boolean isLegacyPasswordOnly() {
        return !PasswordHashUtils.isLikelyUsablePassword(passwordHash)
                && PasswordHashUtils.isLikelyUsablePassword(legacyPassword);
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        if (PasswordHashUtils.isLikelyUsablePassword(passwordHash)) {
            this.legacyPassword = null;
        }
    }
}