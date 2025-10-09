package com.bmss.backend.controller;

import com.bmss.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import lombok.Data;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody AuthRequest request) {
        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(), 
                        request.getPassword()
                )
        );

        var user = (UserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(token);
    }

    
}

