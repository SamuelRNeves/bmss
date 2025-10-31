package com.bmss.backend.service;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.RoleRepository;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

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

    public AuthResponse login(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            var user = userRepository.findByEmail(request.getEmail());
            if (user == null) {
                throw new RuntimeException("Credenciais inválidas");
            }

            var jwtToken = jwtService.generateToken(user.getEmail());

            return new AuthResponse(jwtToken);
        } catch (AuthenticationException e) {
            throw new RuntimeException("Credenciais inválidas");
        }
    }

    public ResponseEntity<?> register(RegisterRequest request) {
        try {
            // Verificar se email já existe
            if (userRepository.findByEmail(request.getEmail()) != null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Email já está cadastrado para receber notificações");
                return ResponseEntity.badRequest().body(response);
            }
    
            // VALIDAÇÃO DO NOME - se for null, usar string vazia
            String nome = request.getName() != null ? request.getName() : "";
    
            // Buscar role padrão (USER) ou criar se não existir
            Role userRole = roleRepository.findByName("USER");
            if (userRole == null) {
                userRole = Role.builder()
                        .name("USER")
                        .build();
                roleRepository.save(userRole);
            }
    
            // Criar novo usuário
            User newUser = User.builder()
                    .name(nome) // Usar nome validado
                    .email(request.getEmail())
                    .passwordHash("NO_PASSWORD")
                    .role(userRole)
                    .notificationPreference(request.getNotificationPreference())
                    .build();
    
            // Salvar usuário
            User savedUser = userRepository.save(newUser);

            // 🔥🔥🔥 ADICIONAR ESTA PARTE PARA ENVIAR EMAIL 🔥🔥🔥
            System.out.println("👤 Usuário salvo no banco: " + savedUser.getEmail());
            
            // Enviar email de boas-vindas (assíncrono)
            new Thread(() -> {
                try {
                    System.out.println("🔄 Iniciando thread de email para: " + savedUser.getEmail());
                    emailService.enviarEmailBoasVindas(savedUser.getEmail(), savedUser.getName());
                    System.out.println("✅ Thread de email finalizada para: " + savedUser.getEmail());
                } catch (Exception e) {
                    System.err.println("❌ Erro na thread de email: " + e.getMessage());
                    e.printStackTrace();
                }
            }).start();
            
            System.out.println("📨 Thread de email iniciada em background");
            // 🔥🔥🔥 FIM DA PARTE DO EMAIL 🔥🔥🔥
    
            // CORREÇÃO: Usar HashMap em vez de Map.of() para evitar NullPointer
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", savedUser.getId());
            userData.put("name", savedUser.getName() != null ? savedUser.getName() : "");
            userData.put("email", savedUser.getEmail());
            userData.put("notificationPreference", savedUser.getNotificationPreference());
    
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cadastro realizado com sucesso! Você começará a receber os resumos diários em breve.");
            response.put("user", userData);
    
            return ResponseEntity.ok(response);
    
        } catch (Exception e) {
            logger.error("Erro no cadastro: ", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Erro ao realizar cadastro. Tente novamente.");
            return ResponseEntity.badRequest().body(response);
        }
    }
}