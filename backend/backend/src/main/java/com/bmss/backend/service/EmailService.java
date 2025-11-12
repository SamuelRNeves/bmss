package com.bmss.backend.service;

import com.resend.Resend;
import com.resend.services.emails.model.SendEmailRequest;
import com.resend.services.emails.model.SendEmailResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final Resend resend;

    private final String fromAddress;

    private final boolean emailEnabled;

    public EmailService(@Value("${resend.api.key:}") String apiKey,
                        @Value("${resend.from.email:BMSS System <noreply@bmss.tech>}") String fromAddress) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("⚠️ resend.api.key não configurado. Os envios de email serão ignorados até que a chave seja informada.");
            this.resend = null;
            this.fromAddress = fromAddress;
            this.emailEnabled = false;
            return;
        }
        this.resend = new Resend(apiKey);
        this.fromAddress = fromAddress;
        this.emailEnabled = true;
    }

    public void enviarEmailBoasVindas(String email, String nome, String perfilInvestidor, String notificacao) {
        try {
            if (!emailEnabled) {
                log.warn("📭 Tentativa de envio para {} ignorada porque o serviço de email está desabilitado.", email);
                return;
            }

            log.info("📧 Enviando email de boas-vindas para {}", email);

            Preferencia preferenciaNormalizada = normalizarPreferencia(notificacao);
            String perfilFormatado = formatarPerfilInvestidor(perfilInvestidor);

            SendEmailRequest request = SendEmailRequest.builder()
                .from(fromAddress)
                .to(email)
                .subject("Bem-vindo ao BMSS 🚀")
                .html("""
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
                """.formatted(nome, perfilFormatado, preferenciaNormalizada.descricao())
                .build();

            SendEmailResponse response = resend.emails().send(request);

            log.info("✅ Email enviado com sucesso! ID: {}", response.getId());

        } catch (Exception e) {
            log.error("❌ Erro ao enviar email: {}", e.getMessage(), e);
        }
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
