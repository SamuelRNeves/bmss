package com.bmss.backend.controller;

import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = {"http://localhost:3000", "https://bmss-sytem.vercel.app"}, allowCredentials = "true")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    // ... outros métodos (register, login)

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        try {
            // Obtém a autenticação do SecurityContext (já validada pelo filtro JWT)
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !authentication.isAuthenticated() || 
                authentication.getPrincipal() == null || 
                authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(401).body(Map.of("error", "Não autenticado"));
            }

            // Obtém o email do usuário autenticado
            String email;
            if (authentication.getPrincipal() instanceof UserDetails) {
                email = ((UserDetails) authentication.getPrincipal()).getUsername();
            } else if (authentication.getPrincipal() instanceof String) {
                email = (String) authentication.getPrincipal();
            } else {
                log.error("❌ Tipo de principal não reconhecido: {}", authentication.getPrincipal().getClass());
                return ResponseEntity.status(500).body(Map.of("error", "Erro interno de autenticação"));
            }

            log.info("🔍 Buscando usuário: {}", email);

            // Busca o usuário no banco
            User user = userRepository.findByEmail(email);
            if (user == null) {
                log.error("❌ Usuário não encontrado para email: {}", email);
                return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
            }

            // ✅ Tratamento seguro de campos nulos
            String investorProfile = (user.getInvestorProfile() != null) 
                    ? user.getInvestorProfile().name() 
                    : "MODERADO";

            String roleName = (user.getRole() != null) 
                    ? user.getRole().getName() 
                    : "USER";

            String notificationPref = (user.getNotificationPreference() != null) 
                    ? user.getNotificationPreference() 
                    : "diario";

            log.info("✅ [AuthController] Usuário autenticado: {}", user.getEmail());

            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "notificationPreference", notificationPref,
                    "investorProfile", investorProfile,
                    "role", roleName
            ));

        } catch (Exception e) {
            log.error("❌ Erro interno em /auth/me", e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Erro interno do servidor",
                    "details", e.getMessage()
            ));
        }
    }
}