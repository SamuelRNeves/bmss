package com.bmss.backend.util;

import java.text.Normalizer;

public final class UserSanitizer {

    private UserSanitizer() {
    }

    public static String normalizeNotificationPreference(String preference) {
        if (preference == null) {
            return "resumo_diario";
        }

        String sanitized = Normalizer.normalize(preference, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .toLowerCase()
                .trim()
                .replaceAll("[^a-z\\s_-]", "")
                .replaceAll("[\\s-]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (sanitized.isEmpty()) {
            return "resumo_diario";
        }

        switch (sanitized) {
            case "alertas_imediatos":
            case "alertas":
            case "imediato":
            case "imediatos":
                return "alertas_imediatos";
            case "sem_notificacoes":
            case "sem_notificacao":
            case "sem_notificacaoes":
            case "none":
            case "desativado":
                return "sem_notificacoes";
            case "resumo_diario":
            case "resumo":
            case "daily":
            default:
                return "resumo_diario";
        }
    }

    public static String sanitizeProfileImageUrl(String raw) {
        if (raw == null) {
            return null;
        }

        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
            return trimmed;
        }

        throw new IllegalArgumentException("URL de imagem inválida. Utilize um endereço completo (https://) ou o caminho retornado pela API.");
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email inválido");
        }

        String normalized = email.trim().toLowerCase();

        if (normalized.isEmpty() || !normalized.contains("@")) {
            throw new IllegalArgumentException("Email inválido");
        }

        return normalized;
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            throw new IllegalArgumentException("Email inválido");
        }

        String normalized = email.trim().toLowerCase();

        if (normalized.isEmpty() || !normalized.contains("@")) {
            throw new IllegalArgumentException("Email inválido");
        }

        return normalized;
    }
}
