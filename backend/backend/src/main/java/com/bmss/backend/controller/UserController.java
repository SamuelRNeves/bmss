package com.bmss.backend.controller;

import com.bmss.backend.model.User;
import com.bmss.backend.model.InvestorProfile;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = {
        "http://localhost:3000",
        "https://bmss-sytem.vercel.app"
}, allowCredentials = "true")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

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
}
