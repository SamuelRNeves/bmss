package com.bmss.backend.controller;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        return authService.login(request);
    }
}
