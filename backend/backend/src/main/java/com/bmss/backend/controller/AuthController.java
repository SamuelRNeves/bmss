package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthMeResponse;
import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import com.bmss.backend.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/v1/auth", "/auth"})
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
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            AuthResponse authResponse = authService.login(request);
            return ResponseEntity.ok(authResponse);
        } catch (BadCredentialsException e) {
            log.warn("Falha de login para {}: {}", request.getEmail(), e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Credenciais inválidas"));
        } catch (Exception e) {
            log.error("Erro interno em /auth/login", e);
            return ResponseEntity.status(500).body(Map.of("error", "Erro interno ao autenticar"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of("error", "Token ausente ou inválido"));
            }

            String email = jwtService.extractUsernameFromAuthHeader(authHeader);
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Token inválido"));
            }

            User u = userRepository.findByEmail(email);
            if (u == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Usuário não encontrado"));
            }

            AuthMeResponse response = AuthMeResponse.fromUser(u);

            log.info("Usuário autenticado: {}", u.getEmail());
            log.debug("InvestorProfile resolvido: {}", response.getInvestorProfile());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            log.warn("Token inválido ou expirado: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            log.error("Erro interno em /auth/me", e);
            return ResponseEntity.status(500).body(Map.of("error", "Erro interno ao processar token"));
        }
    }
}
