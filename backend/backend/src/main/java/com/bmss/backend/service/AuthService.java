package com.bmss.backend.service;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.RoleRepository;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
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

        // Buscar role padrão (USER) ou criar se não existir
        Role userRole = roleRepository.findByName("USER");
        if (userRole == null) {
            userRole = Role.builder()
                    .name("USER")
                    .build();
            roleRepository.save(userRole);
        }

        // Criar novo usuário SEM SENHA
        User newUser = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash("NO_PASSWORD") // ou null, ou gerar um hash dummy
                .role(userRole)
                .build();

        // Salvar usuário
        User savedUser = userRepository.save(newUser);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Cadastro realizado com sucesso! Você receberá notificações sobre o mercado Bitcoin.");
        response.put("user", Map.of(
                "id", savedUser.getId(),
                "name", savedUser.getName(),
                "email", savedUser.getEmail()
        ));

        return ResponseEntity.ok(response);

    } catch (Exception e) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Erro ao realizar cadastro: " + e.getMessage());
        return ResponseEntity.badRequest().body(response);
    }
}
}