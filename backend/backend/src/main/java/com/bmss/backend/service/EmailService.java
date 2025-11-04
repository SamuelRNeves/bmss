// Habilite async em alguma @Configuration da sua app:
// @EnableAsync

// src/main/java/com/bmss/backend/service/EmailService.java
package com.bmss.backend.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void enviarEmailBoasVindas(String email, String nome) {
        if (mailSender == null) return;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("bmssbitcoinmarketsentimentsyst@gmail.com");
        message.setTo(email);
        message.setSubject("🎉 Bem-vindo ao Bitcoin Sentiment Analysis!");
        message.setText("Olá " + nome + ",\n\n" +
                "Seja muito bem-vindo ao nosso sistema de análise de sentimentos do Bitcoin!\n\n" +
                "Você receberá um resumo completo todos os dias às 18h.\n\n" +
                "Equipe Bitcoin Sentiment Analysis");
        mailSender.send(message);
    }
}
