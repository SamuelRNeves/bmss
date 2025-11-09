package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.service.AuthService;
import com.bmss.backend.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:3000","https://bmss-sytem.vercel.app"}, allowCredentials = "true")
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
        var email = jwtService.extractUsernameFromAuthHeader(authHeader);
        User u = userRepository.findByEmail(email);

        if (u == null) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", "Usuário não encontrado"));
        }

        return ResponseEntity.ok(
            java.util.Map.of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "notificationPreference", u.getNotificationPreference(),
                "investorProfile", u.getInvestorProfile().name(),
                "role", u.getRole() != null ? u.getRole().getName() : "USER"
            )
        );
    } catch (Exception e) {
        return ResponseEntity.status(401).body(java.util.Map.of("error", "Token inválido ou expirado"));
    }
}

}
