package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth") // ← CORRIGIDO: Adicionar /api/v1
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
    System.out.println("=== DEBUG CADASTRO ===");
    System.out.println("Nome recebido: " + request.getName());
    System.out.println("Email recebido: " + request.getEmail());
    System.out.println("Preferência recebida: " + request.getNotificationPreference());
    System.out.println("=== FIM DEBUG ===");
    
    return authService.register(request);
}
}

