package com.bmss.backend.service;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import com.bmss.backend.model.User.InvestorProfile;
import com.bmss.backend.repository.RoleRepository;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // ========================================
    // 🔹 LOGIN
    // ========================================
    public AuthResponse login(AuthRequest request) {
    try {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        var user = userRepository.findByEmail(request.getEmail());
        if (user == null) {
            throw new BadCredentialsException("Credenciais inválidas");
        }

        var jwtToken = jwtService.generateToken(user.getEmail());

        return new AuthResponse(jwtToken, null, "Login bem-sucedido");
    } catch (BadCredentialsException e) {
        throw e;
    } catch (AuthenticationException e) {
        throw new BadCredentialsException("Credenciais inválidas", e);
    }
}


    // ========================================
    // 🔹 CADASTRO
    // ========================================
    public ResponseEntity<?> register(RegisterRequest request) {
        try {
            // Verificar se o email já existe
            if (userRepository.findByEmail(request.getEmail()) != null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Email já está cadastrado para receber notificações");
                return ResponseEntity.badRequest().body(response);
            }

            // Validação de nome
            String nome = request.getName() != null ? request.getName() : "";

            // Buscar role padrão (USER)
            Role userRole = roleRepository.findByName("USER");
            if (userRole == null) {
                userRole = Role.builder()
                        .name("USER")
                        .build();
                roleRepository.save(userRole);
            }

            // Converter string para enum InvestorProfile
            InvestorProfile profile;
            try {
                profile = InvestorProfile.valueOf(request.getInvestorProfile().toUpperCase());
            } catch (Exception e) {
                profile = InvestorProfile.MODERADO; // valor padrão
            }

            String notificationPreference = normalizePreference(request.getNotificationPreference());

            // Criar novo usuário
            User newUser = User.builder()
                    .name(nome)
                    .email(request.getEmail())
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .role(userRole)
                    .notificationPreference(notificationPreference)
                    .investorProfile(profile)
                    .profileImageUrl(request.getProfileImageUrl())
                    .build();

            User savedUser = userRepository.save(newUser);

            // Enviar email de boas-vindas (assíncrono)
            System.out.println("👤 Usuário salvo no banco: " + savedUser.getEmail());
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.enviarEmailBoasVindas(
                            savedUser.getEmail(),
                            savedUser.getName(),
                            savedUser.getInvestorProfile().name(),
                            savedUser.getNotificationPreference()
                    );
                    System.out.println("✅ Email de boas-vindas enviado para: " + savedUser.getEmail());
                } catch (Exception e) {
                    System.err.println("❌ Erro ao enviar email: " + e.getMessage());
                    e.printStackTrace();
                }
            });

            // Gerar token JWT
            var jwtToken = jwtService.generateToken(savedUser.getEmail());

            // Montar resposta
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", savedUser.getId());
            userData.put("name", savedUser.getName());
            userData.put("email", savedUser.getEmail());
            userData.put("notificationPreference", savedUser.getNotificationPreference());
            userData.put("investorProfile", savedUser.getInvestorProfile().name());
            userData.put("profileImageUrl", savedUser.getProfileImageUrl());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cadastro realizado com sucesso!");
            response.put("token", jwtToken);
            response.put("user", userData);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Erro no cadastro: ", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Erro ao realizar cadastro. Tente novamente.");
            return ResponseEntity.badRequest().body(response);
        }
    }

    private String normalizePreference(String preference) {
        if (preference == null) {
            return "resumo_diario";
        }

        String sanitized = Normalizer.normalize(preference, Normalizer.Form.NFD)
                .replaceAll("[^\p{ASCII}]", "")
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
}
