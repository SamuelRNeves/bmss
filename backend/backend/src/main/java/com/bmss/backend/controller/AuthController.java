package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.service.AuthService;
import com.bmss.backend.config.UserService; // IMPORT
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "https://bmss-sytem.vercel.app",
                "https://bmss-sytem-1b8p5pt9k-samuel-neves-projects.vercel.app"
        },
        allowCredentials = "true"
)
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final UserService userService; // CAMPO INJETADO

    // CONSTRUTOR COM INJEÇÃO
    public AuthController(AuthService authService, UserRepository userRepository, UserService userService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    // REGISTRO COM AUTO-LOGIN
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse response = userService.registerWithAutoLogin(request); // usa a instância
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro no registro de usuário: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Erro interno no registro"));
        }
    }

    // ==========================================================
    // 🔹 POST: Login
    // ==========================================================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erro no login: {}", e.getMessage(), e);
            return ResponseEntity.status(401).body(new AuthResponse(null, null, null));
        }
    }

    // ==========================================================
    // 🔹 GET: Retornar usuário autenticado (/me)
    // ==========================================================
    @GetMapping("/me")
    public ResponseEntity<?> me() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated() ||
                authentication.getPrincipal() == null ||
                authentication.getPrincipal().equals("anonymousUser")) {
                return ResponseEntity.status(401).body(Map.of("error", "Não autenticado"));
            }

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

            User user = userRepository.findByEmail(email);
            if (user == null) {
                log.error("❌ Usuário não encontrado para email: {}", email);
                return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
            }

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
