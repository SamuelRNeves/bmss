package com.bmss.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void enviarEmailBoasVindas(String email, String nome) {
        System.out.println("📧 INICIANDO ENVIO DE EMAIL para: " + email);
        
        // Se o mailSender não estiver configurado
        if (mailSender == null) {
            System.out.println("❌ JavaMailSender é NULL - verifique as configurações no application.properties");
            return;
        }

        try {
            System.out.println("✅ JavaMailSender encontrado, configurando email...");
            
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("bmssbitcoinmarketsentimentsyst@gmail.com");
            message.setTo(email);
            message.setSubject("🎉 Bem-vindo ao Bitcoin Sentiment Analysis!");
            message.setText(
                "Olá " + nome + ",\n\n" +
                "Seja muito bem-vindo ao nosso sistema de análise de sentimentos do Bitcoin!\n\n" +
                "📊 O que você vai receber:\n" +
                "• Resumos diários sobre o sentimento do mercado Bitcoin\n" +
                "• Alertas de mudanças significativas no mercado\n" +
                "• Análises baseadas em notícias e redes sociais\n\n" +
                "⏰ Frequência:\n" +
                "Você receberá um resumo completo todos os dias às 18h.\n\n" +
                "Obrigado por se cadastrar!\n" +
                "Equipe Bitcoin Sentiment Analysis\n\n" +
                "---\n" +
                "Este é um email automático"
            );
            
            System.out.println("📤 Enviando email para: " + email);
            mailSender.send(message);
            System.out.println("✅ Email enviado com SUCESSO para: " + email);
            
        } catch (Exception e) {
            System.err.println("❌ ERRO ao enviar email: " + e.getMessage());
            e.printStackTrace();
        }
    }
}