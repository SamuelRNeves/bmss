package com.bmss.backend.service;

import com.bmss.backend.config.EmailProperties;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.SendEmailRequest;
import com.resend.services.emails.model.SendEmailResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

@Service
@Slf4j
public class EmailService {
    private static final String FALLBACK_FROM_ADDRESS = "BMSS Alerts <onboarding@resend.dev>";
    private static final AtomicInteger EXECUTOR_THREAD_COUNTER = new AtomicInteger(0);

    private final Resend resend;

    private final String fromAddress;

    private final boolean emailEnabled;

    private final String disabledReason;

    private final AtomicReference<EmailDeliveryResult> lastDeliveryResult = new AtomicReference<>();

    private final ExecutorService emailExecutor;

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

        this.emailExecutor = Executors.newCachedThreadPool(newEmailThreadFactory());
    }

    @PostConstruct
    public void debugEmailConfig() {
        log.info("📧 RESEND FROM = '{}'", fromAddress);
    }

    @PreDestroy
    void shutdownExecutor() {
        emailExecutor.shutdown();
    }

    public EmailDeliveryResult enviarEmailBoasVindas(String email, String nome, String perfilInvestidor, String notificacao) {
        Instant attemptAt = Instant.now();
        String subject = "Bem-vindo ao BMSS 🚀";

        if (!emailEnabled) {
            EmailDeliveryResult result = EmailDeliveryResult.failure(email, subject, attemptAt, disabledReason);
            lastDeliveryResult.set(result);
            log.warn("📭 Envio desabilitado. FROM='{}' TO='{}'. Motivo: {}", fromAddress, email, disabledReason);
            return result;
        }

        log.info("📧 Preparando email de boas-vindas. FROM='{}' TO='{}'", fromAddress, email);

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

        EmailDeliveryResult result = tentarEnvioComFallback(email, subject, attemptAt, htmlContent);
        lastDeliveryResult.set(result);
        return result;
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

    private EmailDeliveryResult tentarEnvioComFallback(String destinatario, String subject, Instant attemptAt, String htmlContent) {
        return enviarComRemetenteAsync(fromAddress, destinatario, subject, htmlContent)
                .handleAsync((response, throwable) -> {
                    if (throwable == null) {
                        log.info("✅ Email enviado pelo Resend. FROM='{}' TO='{}'. Response: {}", fromAddress, destinatario, response);
                        return CompletableFuture.completedFuture(EmailDeliveryResult.success(destinatario, subject, attemptAt, response.getId()));
                    }
                    return tratarFalhaComPossivelFallback(destinatario, subject, attemptAt, htmlContent, throwable);
                }, emailExecutor)
                .thenCompose(Function.identity())
                .join();
    }

    private boolean deveUsarFallback(int statusCode) {
        return statusCode == 400 || statusCode == 422;
    }

    private CompletableFuture<EmailDeliveryResult> tratarFalhaComPossivelFallback(String destinatario,
                                                                                 String subject,
                                                                                 Instant attemptAt,
                                                                                 String htmlContent,
                                                                                 Throwable primaryError) {
        Throwable rootCause = unwrap(primaryError);
        int statusCode = extrairStatusCode(rootCause);
        log.error("❌ Falha ao enviar email. FROM='{}' TO='{}'. HTTP Status: {}. Detalhes: {}",
                fromAddress,
                destinatario,
                statusCode == -1 ? "desconhecido" : statusCode,
                rootCause.getMessage(),
                rootCause);

        if (deveUsarFallback(statusCode)) {
            log.warn("🔄 Reenviando com fallback de remetente devido a possível rejeição por DNS/SPF/DKIM. Novo FROM='{}'",
                    FALLBACK_FROM_ADDRESS);
            return enviarComRemetenteAsync(FALLBACK_FROM_ADDRESS, destinatario, subject, htmlContent)
                    .handleAsync((fallbackResponse, fallbackThrowable) -> {
                        if (fallbackThrowable == null) {
                            log.info("✅ Email enviado com fallback. FROM='{}' TO='{}'. Response: {}",
                                    FALLBACK_FROM_ADDRESS,
                                    destinatario,
                                    fallbackResponse);
                            return EmailDeliveryResult.success(destinatario, subject, attemptAt, fallbackResponse.getId());
                        }

                        Throwable fallbackRoot = unwrap(fallbackThrowable);
                        int fallbackStatus = extrairStatusCode(fallbackRoot);
                        String failureReason = "Falha após fallback: " + Optional.ofNullable(fallbackRoot.getMessage()).orElse("Erro desconhecido");
                        log.error("❌ Fallback também falhou. FROM='{}' TO='{}'. HTTP Status: {}. Detalhes: {}",
                                FALLBACK_FROM_ADDRESS,
                                destinatario,
                                fallbackStatus == -1 ? "desconhecido" : fallbackStatus,
                                fallbackRoot.getMessage(),
                                fallbackRoot);
                        return EmailDeliveryResult.failure(destinatario, subject, attemptAt, formatFailureMessage(fallbackStatus, failureReason));
                    }, emailExecutor);
        }

        String failureReason = Optional.ofNullable(rootCause.getMessage()).orElse("Erro desconhecido ao enviar email");
        return CompletableFuture.completedFuture(EmailDeliveryResult.failure(destinatario, subject, attemptAt, formatFailureMessage(statusCode, failureReason)));
    }

    private CompletableFuture<SendEmailResponse> enviarComRemetenteAsync(String remetente,
                                                                         String destinatario,
                                                                         String subject,
                                                                         String htmlContent) {
        return CompletableFuture.supplyAsync(() -> enviarComRemetente(remetente, destinatario, subject, htmlContent), emailExecutor);
    }

    private SendEmailResponse enviarComRemetente(String remetente, String destinatario, String subject, String htmlContent) {
        SendEmailRequest request = SendEmailRequest.builder()
                .from(remetente)
                .to(destinatario)
                .subject(subject)
                .html(htmlContent)
                .build();
        log.debug("📨 Payload Resend preparado. FROM='{}' TO='{}' SUBJECT='{}'", remetente, destinatario, subject);
        try {
            return resend.emails().send(request);
        } catch (ResendException e) {
            throw new CompletionException(e);
        }
    }

    private ThreadFactory newEmailThreadFactory() {
        return runnable -> {
            Thread thread = new Thread(runnable);
            thread.setName("resend-email-worker-" + EXECUTOR_THREAD_COUNTER.incrementAndGet());
            thread.setDaemon(true);
            return thread;
        };
    }

    private int extrairStatusCode(Throwable throwable) {
        Throwable current = unwrap(throwable);
        while (current != null) {
            Integer code = invocarMetodoInteger(current, "getStatusCode");
            if (code != null) {
                return code;
            }
            current = current.getCause();
        }
        return -1;
    }

    private Throwable unwrap(Throwable throwable) {
        if (throwable instanceof CompletionException completionException && completionException.getCause() != null) {
            return completionException.getCause();
        }
        return throwable;
    }

    private Integer invocarMetodoInteger(Throwable throwable, String methodName) {
        try {
            var method = throwable.getClass().getMethod(methodName);
            Object value = method.invoke(throwable);
            if (value instanceof Integer code) {
                return code;
            }
        } catch (Exception ignored) {
            // método não disponível
        }
        return null;
    }

    private String formatFailureMessage(int statusCode, String message) {
        if (statusCode == -1) {
            return message;
        }
        return "HTTP " + statusCode + " - " + message;
    }
}