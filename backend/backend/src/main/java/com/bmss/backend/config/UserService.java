package com.bmss.backend.config;

import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import com.bmss.backend.util.UserSanitizer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService; // Usa JwtService, não JwtUtil

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Integer id) {
        return userRepository.findById(id);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public void deleteById(Integer id) {
        userRepository.deleteById(id);
    }

    // ================== VALIDAÇÃO DE SENHA ==================
    public enum PasswordStrength {
        WEAK("Fraca"),
        MEDIUM("Média"),
        STRONG("Forte");

        private final String label;
        PasswordStrength(String label) { this.label = label; }
        public String getLabel() { return label; }
    }

    public PasswordStrength evaluatePassword(String password) {
        if (password == null || password.length() < 8) {
            return PasswordStrength.WEAK;
        }
        boolean hasUpper = password.matches(".*[A-Z].*");
        boolean hasLower = password.matches(".*[a-z].*");
        boolean hasDigit = password.matches(".*\\d.*");
        boolean hasSpecial = password.matches(".*[@$!%*?&].*");

        if (!hasUpper || !hasLower || !hasDigit) {
            return PasswordStrength.WEAK;
        }
        if (password.length() >= 12 && hasSpecial) {
            return PasswordStrength.STRONG;
        }
        return PasswordStrength.MEDIUM;
    }

    // ================== REGISTRO COM AUTO-LOGIN ==================
    public AuthResponse registerWithAutoLogin(RegisterRequest request) {
        PasswordStrength strength = evaluatePassword(request.getPassword());
        if (strength == PasswordStrength.WEAK) {
            throw new IllegalArgumentException("Senha muito fraca. Mínimo: 8 caracteres com maiúscula, minúscula e número.");
        }

        if (userRepository.findByEmail(request.getEmail()) != null) {
            throw new IllegalArgumentException("Email já cadastrado.");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNotificationPreference(UserSanitizer.normalizeNotificationPreference(request.getNotificationPreference()));
        user.setInvestorProfile(User.InvestorProfile.valueOf(request.getInvestorProfile()));
        user.setProfileImageUrl(UserSanitizer.sanitizeProfileImage(request.getProfileImageUrl()));

        User saved = userRepository.save(user);

        // Usa JwtService para gerar token
        String token = jwtService.generateToken(saved.getEmail());

        return new AuthResponse(token, null, "Cadastro realizado com sucesso! Força da senha: " + strength.getLabel());
    }
}