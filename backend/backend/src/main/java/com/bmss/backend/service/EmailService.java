package com.bmss.backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    @Value("${bmss.mail.from-address:${spring.mail.username:}}")
    private String fromAddress;

    @Async
    public void enviarEmailBoasVindas(String email, String nome) {
        if (email == null || email.isBlank()) {
            log.warn("⚠️ Endereço de email inválido fornecido para envio de boas-vindas.");
            return;
        }

        if (mailSender == null) {
            log.error("❌ JavaMailSender não configurado. Email não será enviado para {}", email);
            return;
        }

        if (fromAddress == null || fromAddress.isBlank()) {
            log.error("❌ Remetente do email não configurado. Configure 'bmss.mail.from-address' ou 'spring.mail.username'.");
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject("🎉 Bem-vindo ao Bitcoin Sentiment Analysis!");
        message.setText("Olá " + nome + ",\n\n" +
                "Seja muito bem-vindo ao nosso sistema de análise de sentimentos do Bitcoin!\n\n" +
                "Você receberá um resumo completo todos os dias às 18h.\n\n" +
                "Equipe Bitcoin Sentiment Analysis");

        try {
            mailSender.send(message);
            log.info("📬 Email de boas-vindas enviado para {}", email);
        } catch (MailException ex) {
            log.error("❌ Falha ao enviar email de boas-vindas para {}: {}", email, ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("❌ Erro inesperado ao enviar email de boas-vindas para {}: {}", email, ex.getMessage(), ex);
        }
    }
}
