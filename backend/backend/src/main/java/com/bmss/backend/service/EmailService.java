package com.bmss.backend.service;

import com.bmss.backend.config.EmailProperties;
import com.resend.Resend;
import com.resend.services.emails.model.SendEmailRequest;
import com.resend.services.emails.model.SendEmailResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Slf4j
public class EmailService {

    private final Resend resend;

    private final String fromAddress;

    private final boolean emailEnabled;

    private final String disabledReason;

    private final AtomicReference<EmailDeliveryResult> lastDeliveryResult = new AtomicReference<>();

    public EmailService(EmailProperties emailProperties) {
        this.fromAddress = emailProperties.resolveFromEmail();
        if (emailProperties.isEnabled()) {
            this.resend = new Resend(emailProperties.getApiKey());
            this.emailEnabled = true;
            this.disabledReason = null;
        } else {
            this.resend = null;
            this.emailEnabled = false;
            this.disabledReason = emailProperties.getDisabledReason()
                    .orElse("Serviço de email desabilitado");
        }
    }

    public EmailDeliveryResult enviarEmailBoasVindas(String email, String nome, String perfilInvestidor, String notificacao) {
        Instant attemptAt = Instant.now();
        String subject = "Bem-vindo ao BMSS 🚀";

        if (!emailEnabled) {
            EmailDeliveryResult result = EmailDeliveryResult.failure(email, subject, attemptAt, disabledReason);
            lastDeliveryResult.set(result);
            log.warn("📭 Tentativa de envio para {} ignorada: {}", email, disabledReason);
            return result;
        }

        try {
            log.info("📧 Enviando email de boas-vindas para {}", email);

            Preferencia preferenciaNormalizada = normalizarPreferencia(notificacao);
            String perfilFormatado = formatarPerfilInvestidor(perfilInvestidor);

            String htmlContent = """
                    <h2>Olá, %s! 👋</h2>
                    <p>Você agora está inscrito para receber análises inteligentes do sentimento do mercado Bitcoin.</p>
                    <br/>
                    <p><strong>Suas preferências:</strong></p>
                    <ul>
                        <li>📊 Perfil de investidor: %s</li>
                        <li>🔔 Notificações: %s</li>
                    </ul>
                    <br/>
                    <p>Você pode alterar essa configuração a qualquer momento em seu painel de usuário.</p>
                    <br/>
                    <p>Atenciosamente,</p>
                    <p><strong>Equipe BMSS</strong></p>
                """.formatted(nome, perfilFormatado, preferenciaNormalizada.descricao());

            SendEmailRequest request = SendEmailRequest.builder()
                    .from(fromAddress)
                    .to(email)
                    .subject(subject)
                    .html(htmlContent)
                    .build();

            SendEmailResponse response = resend.emails().send(request);

            EmailDeliveryResult result = EmailDeliveryResult.success(email, subject, attemptAt, response.getId());
            lastDeliveryResult.set(result);

            log.info("✅ Email enviado com sucesso! ID: {}", response.getId());

            return result;
        } catch (Exception e) {
            String message = Optional.ofNullable(e.getMessage()).orElse("Erro desconhecido ao enviar email");
            EmailDeliveryResult result = EmailDeliveryResult.failure(email, subject, attemptAt, message);
            lastDeliveryResult.set(result);
            log.error("❌ Erro ao enviar email: {}", message, e);
            return result;
        }
    }

    public Optional<EmailDeliveryResult> getLastDeliveryResult() {
        return Optional.ofNullable(lastDeliveryResult.get());
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }

    public Optional<String> getDisabledReasonMessage() {
        return Optional.ofNullable(disabledReason);
    }

    private Preferencia normalizarPreferencia(String notificacao) {
        if (notificacao == null) {
            return new Preferencia("Resumo diário de mercado");
        }

        String normalizada = notificacao.toLowerCase();

        return switch (normalizada) {
            case "imediato", "alertas", "alertas_imediatos", "alerta_imediato" ->
                new Preferencia("Alertas imediatos sobre grandes oscilações");
            case "desativado", "sem_notificacoes", "sem-notificacoes", "sem notificacoes", "sem notificações" ->
                new Preferencia("Sem notificações automáticas");
            case "diario", "resumo_diario", "resumo diário" ->
                new Preferencia("Resumo diário de mercado");
            default -> new Preferencia("Resumo diário de mercado");
        };
    }

    private String formatarPerfilInvestidor(String perfilInvestidor) {
        if (perfilInvestidor == null) {
            return "Moderado";
        }

        return switch (perfilInvestidor.toUpperCase()) {
            case "CONSERVADOR" -> "Conservador";
            case "AGRESSIVO" -> "Agressivo";
            default -> "Moderado";
        };
    }

    private record Preferencia(String descricao) {
    }
}