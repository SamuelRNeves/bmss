package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import com.bmss.backend.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = {"http://localhost:3000", "https://bmss-sytem.vercel.app"}, allowCredentials = "true")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthController(AuthService authService, UserRepository userRepository, JwtService jwtService) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Token ausente ou inválido"));
        }

        try {
            String email = jwtService.extractUsernameFromAuthHeader(authHeader);
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(401).body(java.util.Map.of("error", "Token inválido"));
            }

            User u = userRepository.findByEmail(email);
            if (u == null) {
                return ResponseEntity.status(404).body(java.util.Map.of("error", "Usuário não encontrado"));
            }

            // ✅ Tratamento de campos nulos
            String investorProfile = (u.getInvestorProfile() != null)
                    ? u.getInvestorProfile().name()
                    : "MODERADO"; // valor padrão se vier nulo

            String roleName = (u.getRole() != null)
                    ? u.getRole().getName()
                    : "USER";

            log.info("✅ [AuthController] Usuário autenticado: {}", u.getEmail());
            log.debug("📊 InvestorProfile: {}", investorProfile);

            return ResponseEntity.ok(java.util.Map.of(
                    "id", u.getId(),
                    "name", u.getName(),
                    "email", u.getEmail(),
                    "notificationPreference", u.getNotificationPreference(),
                    "investorProfile", investorProfile,
                    "role", roleName
            ));

        } catch (IllegalStateException e) {
            log.warn("⚠️ Token inválido ou expirado: {}", e.getMessage());
            return ResponseEntity.status(401).body(java.util.Map.of("error", e.getMessage()));

        } catch (Exception e) {
            log.error("❌ Erro interno em /auth/me", e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", "Erro interno ao processar token"));
        }
    }
}
