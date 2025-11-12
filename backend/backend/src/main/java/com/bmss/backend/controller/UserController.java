package com.bmss.backend.controller;

import com.bmss.backend.dto.PasswordChangeRequest;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "https://bmss-sytem.vercel.app"
}, allowCredentials = "true")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 🔹 Listar todos os usuários (admin)
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    // 🔹 Buscar por ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Integer id) {
        Optional<User> user = userRepository.findById(id);
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // 🔹 Criar novo usuário
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        return ResponseEntity.ok(userRepository.save(user));
    }

    // 🔹 Atualizar perfil (somente o próprio usuário)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Integer id,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody User updatedUser
    ) {
        try {
            String email = jwtService.extractUsernameFromAuthHeader(authHeader);
            User user = userRepository.findByEmail(email);

            if (user == null || !user.getId().equals(id)) {
                return ResponseEntity.status(403).body("Acesso negado");
            }

            // Atualiza somente campos editáveis
            if (updatedUser.getInvestorProfile() != null)
                user.setInvestorProfile(updatedUser.getInvestorProfile());

            if (updatedUser.getNotificationPreference() != null)
                user.setNotificationPreference(updatedUser.getNotificationPreference());

            userRepository.save(user);

            return ResponseEntity.ok(
                    java.util.Map.of(
                            "success", true,
                            "message", "Perfil atualizado com sucesso",
                            "investorProfile", user.getInvestorProfile(),
                            "notificationPreference", user.getNotificationPreference()
                    )
            );

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao atualizar perfil: " + e.getMessage());
        }
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(
            @PathVariable Integer id,
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PasswordChangeRequest request
    ) {
        try {
            if (request == null) {
                return ResponseEntity.badRequest().body("Requisição inválida");
            }

            String email = jwtService.extractUsernameFromAuthHeader(authHeader);
            User user = userRepository.findByEmail(email);

            if (user == null || !user.getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acesso negado");
            }

            if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                return ResponseEntity.badRequest().body("Informe a senha atual");
            }

            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Senha atual incorreta");
            }

            String newPassword = request.getNewPassword();
            if (newPassword == null || newPassword.isBlank()) {
                return ResponseEntity.badRequest().body("Informe a nova senha");
            }

            if (newPassword.length() < 8) {
                return ResponseEntity.badRequest()
                        .body("A nova senha deve ter pelo menos 8 caracteres");
            }

            if (!newPassword.matches(".*[A-Z].*")) {
                return ResponseEntity.badRequest()
                        .body("A nova senha deve conter pelo menos uma letra maiúscula");
            }

            if (!newPassword.matches(".*[a-z].*")) {
                return ResponseEntity.badRequest()
                        .body("A nova senha deve conter pelo menos uma letra minúscula");
            }

            if (!newPassword.matches(".*\\d.*")) {
                return ResponseEntity.badRequest()
                        .body("A nova senha deve conter pelo menos um número");
            }

            if (request.getConfirmPassword() != null && !newPassword.equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body("As senhas não coincidem");
            }

            if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
                return ResponseEntity.badRequest()
                        .body("A nova senha deve ser diferente da senha atual");
            }

            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            return ResponseEntity.ok(java.util.Map.of(
                    "success", true,
                    "message", "Senha atualizada com sucesso"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Erro ao alterar senha: " + e.getMessage());
        }
    }
}
