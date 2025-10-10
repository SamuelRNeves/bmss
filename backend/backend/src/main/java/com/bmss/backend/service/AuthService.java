package com.bmss.backend.service;

import com.bmss.backend.dto.AuthenticationRequest;
import com.bmss.backend.dto.AuthenticationResponse;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new RuntimeException("Credenciais inválidas");
        }

        User user = userRepository.findByEmail(request.getEmail());
        String token = jwtService.generateToken(user.getEmail());

        return new AuthenticationResponse(token);
    }
}
