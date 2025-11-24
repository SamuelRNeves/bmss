package com.bmss.backend.config;

import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import com.bmss.backend.repository.RoleRepository;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import com.bmss.backend.service.EmailDeliveryResult;
import com.bmss.backend.service.EmailService;
import com.bmss.backend.service.ProfileImageStorageService;
import com.bmss.backend.util.UserSanitizer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService; // Usa JwtService, não JwtUtil
    private final RoleRepository roleRepository;
    private final ProfileImageStorageService profileImageStorageService;
    private final EmailService emailService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       RoleRepository roleRepository,
                       ProfileImageStorageService profileImageStorageService,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.roleRepository = roleRepository;
        this.profileImageStorageService = profileImageStorageService;
        this.emailService = emailService;
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
    @Transactional(rollbackFor = Exception.class)
    public AuthResponse registerWithAutoLogin(RegisterRequest request) {
        PasswordStrength strength = evaluatePassword(request.getPassword());
        if (strength == PasswordStrength.WEAK) {
            throw new IllegalArgumentException("Senha muito fraca. Mínimo: 8 caracteres com maiúscula, minúscula e número.");
        }

        String sanitizedName = request.getName() == null ? "" : request.getName().trim();
        if (sanitizedName.isBlank()) {
            throw new IllegalArgumentException("Nome é obrigatório.");
        }

        String sanitizedEmail = UserSanitizer.normalizeEmail(request.getEmail());

        if (userRepository.findByEmailIgnoreCase(sanitizedEmail) != null) {
            throw new IllegalArgumentException("Email já cadastrado.");
        }

        Role userRole = roleRepository.findByName("USER");
        if (userRole == null) {
            userRole = Role.builder().name("USER").build();
            roleRepository.save(userRole);
        }

        User user = new User();
        user.setName(sanitizedName);
        user.setEmail(sanitizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setNotificationPreference(UserSanitizer.normalizeNotificationPreference(request.getNotificationPreference()));

        String investorProfile = request.getInvestorProfile();
        User.InvestorProfile resolvedProfile;
        try {
            resolvedProfile = investorProfile != null
                    ? User.InvestorProfile.valueOf(investorProfile.trim().toUpperCase())
                    : User.InvestorProfile.MODERADO;
        } catch (IllegalArgumentException ex) {
            resolvedProfile = User.InvestorProfile.MODERADO;
        }
        user.setInvestorProfile(resolvedProfile);

        user.setProfileImageUrl(null);
        user.setRole(userRole);

        User saved = userRepository.save(user);

        String rawProfileImage = request.getProfileImageUrl();
        if (rawProfileImage != null && !rawProfileImage.trim().isEmpty()) {
            try {
                String storedValue;
                if (profileImageStorageService.isDataUrl(rawProfileImage)) {
                    storedValue = profileImageStorageService.storeBase64Image(rawProfileImage, saved.getId());
                } else {
                    storedValue = UserSanitizer.sanitizeProfileImageUrl(rawProfileImage);
                }
                saved.setProfileImageUrl(storedValue);
                saved = userRepository.save(saved);
            } catch (IllegalArgumentException imageError) {
                throw new IllegalArgumentException(imageError.getMessage(), imageError);
            } catch (IllegalStateException storageError) {
                throw new IllegalArgumentException("Não foi possível salvar a imagem de perfil. Escolha um arquivo menor.", storageError);
            }
        }

        User finalSavedUser = saved;
        CompletableFuture.runAsync(() -> enviarEmailBoasVindas(finalSavedUser));

        // Usa JwtService para gerar token
        String token = jwtService.generateToken(saved.getEmail());

        return new AuthResponse(token, null, "Cadastro realizado com sucesso! Força da senha: " + strength.getLabel());
    }

    private void enviarEmailBoasVindas(User usuario) {
        if (usuario == null) {
            return;
        }

        try {
            String perfil = usuario.getInvestorProfile() != null
                    ? usuario.getInvestorProfile().name()
                    : User.InvestorProfile.MODERADO.name();

            EmailDeliveryResult result = emailService.enviarEmailBoasVindas(
                    usuario.getEmail(),
                    usuario.getName(),
                    perfil,
                    usuario.getNotificationPreference()
            );

            if (result.sent()) {
                log.info("✅ Email de boas-vindas enviado para: {} (ID: {})",
                        usuario.getEmail(),
                        result.providerMessageId());
            } else {
                log.warn("📭 Email de boas-vindas não enviado para {}: {}",
                        usuario.getEmail(),
                        result.failureReason());
            }
        } catch (Exception e) {
            log.error("❌ Erro ao enviar email de boas-vindas para {}: {}",
                    usuario.getEmail(),
                    e.getMessage(),
                    e);
        }
    }
}