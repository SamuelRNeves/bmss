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

    public EmailService(@Value("${resend.api.key}") String apiKey) {
        this.resend = new Resend(apiKey);
    }

    public void enviarEmailBoasVindas(String email, String nome) {
        try {
            log.info("📧 Enviando email de boas-vindas para {}", email);

            SendEmailRequest request = SendEmailRequest.builder()
                .from("BMSS System <noreply@bmss.tech>")
                .to(email)
                .subject("Bem-vindo ao BMSS 🚀")
                .html("""
                    <h2>Olá, %s! 👋</h2>
                    <p>Você agora está inscrito para receber alertas de sentimento do mercado Bitcoin.</p>
                    <p>Obrigado por utilizar o <strong>BMSS – Bitcoin Market Sentiment System</strong>.</p>
                    <br/>
                    <p>🟡 Status: Ativo</p>
                    <p>⏰ Você será notificado sempre que houver mudança significativa no sentimento do mercado.</p>
                    <br/>
                    <p>Atenciosamente,</p>
                    <p><strong>Equipe BMSS</strong></p>
                """.formatted(nome))
                .build();

            SendEmailResponse response = resend.emails().send(request);

            log.info("✅ Email enviado com sucesso! ID: {}", response.getId());

        } catch (Exception e) {
            log.error("❌ Erro ao enviar email: {}", e.getMessage(), e);
        }
    }
}
