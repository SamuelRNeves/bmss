package com.bmss.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Optional;

@Component
@ConfigurationProperties(prefix = "resend")
@Getter
@Setter
@Slf4j
public class EmailProperties {

    private String apiKey;

    private String fromEmail;

    private String disabledReason;

    public boolean isEnabled() {
        String trimmedKey = apiKey == null ? null : apiKey.trim();
        if (trimmedKey == null || trimmedKey.isEmpty()) {
            disabledReason = "resend.api.key não configurado";
            return false;
        }

        if (trimmedKey.toLowerCase(Locale.ROOT).startsWith("dummy-key")) {
            disabledReason = "chave de API de demonstração detectada";
            return false;
        }

        disabledReason = null;
        apiKey = trimmedKey;
        return true;
    }

    public Optional<String> getDisabledReason() {
        return Optional.ofNullable(disabledReason);
    }

    public String resolveFromEmail() {
        if (fromEmail == null || fromEmail.isBlank()) {
            return "BMSS Alerts <onboarding@resend.dev>";
        }
        return fromEmail.trim();
    }

    @PostConstruct
    void logConfiguration() {
        if (!isEnabled()) {
            log.warn("✉️ Serviço de email iniciará desabilitado: {}", disabledReason);
        } else {
            log.info("✉️ Serviço de email habilitado com remetente '{}'", resolveFromEmail());
        }
    }
}
