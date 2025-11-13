package com.bmss.backend.service;

import com.bmss.backend.dto.AuthRequest;
import com.bmss.backend.dto.AuthResponse;
import com.bmss.backend.dto.RegisterRequest;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import com.bmss.backend.model.User.InvestorProfile;
import com.bmss.backend.repository.RoleRepository;
import com.bmss.backend.repository.UserRepository;
import com.bmss.backend.security.JwtService;
import com.bmss.backend.security.PasswordHashUtils;
import com.bmss.backend.security.PasswordHashUtils.PasswordHashType;
import com.bmss.backend.util.UserSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    // ========================================
    // 🔹 LOGIN
    // ========================================
    public AuthResponse login(AuthRequest request) {
        try {
            String sanitizedEmail = UserSanitizer.normalizeEmail(request.getEmail());

            User user = userRepository.findByEmailIgnoreCase(sanitizedEmail);
            if (user == null) {
                user = userRepository.findByEmailNormalized(sanitizedEmail);
            }

            if (user == null) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            String storedEmail = user.getEmail() != null ? user.getEmail() : "";
            boolean emailNeedsUpdate = !storedEmail.equals(sanitizedEmail);

            String rawPassword = request.getPassword();
            if (rawPassword == null || rawPassword.isBlank()) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            String storedPassword = user.getResolvedPasswordHash();
            if ((storedPassword == null || storedPassword.isBlank()) && jdbcTemplate != null) {
                String legacyPassword = fetchLegacyPassword(user.getId());
                if (legacyPassword != null && !legacyPassword.isBlank()) {
                    user.setLegacyPassword(legacyPassword);
                    storedPassword = legacyPassword;
                    logger.info("Senha legada recuperada para usuário {}", sanitizedEmail);
                }
            }
            if (storedPassword == null || storedPassword.isBlank()) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            boolean legacyOnly = user.isLegacyPasswordOnly();
            String normalizedHash = PasswordHashUtils.normalizeLegacyHash(storedPassword);
            if (normalizedHash == null || normalizedHash.isBlank()) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            String trimmedOriginal = storedPassword.trim();
            PasswordHashType hashType = PasswordHashUtils.detectHashType(normalizedHash);

            boolean passwordMatches = matchesAgainstKnownHashes(rawPassword, normalizedHash, trimmedOriginal);

            if (!passwordMatches) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            boolean upgradedHash = passwordEncoder.upgradeEncoding(normalizedHash)
                    || legacyOnly
                    || !normalizedHash.equals(trimmedOriginal);

            if (upgradedHash) {
                String reencoded = passwordEncoder.encode(rawPassword);
                user.setPasswordHash(reencoded);
                logger.info("Atualizando hash de senha legado ({} -> delegating) para usuário {}",
                        hashType,
                        sanitizedEmail);
            }

            if (emailNeedsUpdate) {
                user.setEmail(sanitizedEmail);
                logger.info("Corrigindo email com espaços extras para usuário {}", sanitizedEmail);
            }

            if (upgradedHash || emailNeedsUpdate) {
                userRepository.save(user);
            }

            var jwtToken = jwtService.generateToken(user.getEmail());

            String message;
            if (upgradedHash) {
                if (hashType == PasswordHashType.PLAINTEXT_OR_UNKNOWN) {
                    message = "Login bem-sucedido. Senha criptografada com segurança.";
                } else if (hashType == PasswordHashType.SHA256) {
                    message = "Login bem-sucedido. Hash de senha modernizado.";
                } else if (hashType == PasswordHashType.BCRYPT && !PasswordHashUtils.hasDelegatingPrefix(trimmedOriginal)) {
                    message = "Login bem-sucedido. Hash BCrypt atualizado.";
                } else {
                    message = "Login bem-sucedido";
                }
            } else {
                message = "Login bem-sucedido";
            }

            return new AuthResponse(jwtToken, null, message);
        } catch (BadCredentialsException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            throw new BadCredentialsException("Credenciais inválidas", e);
        }
    }

    private boolean matchesAgainstKnownHashes(String rawPassword, String normalizedHash, String originalHash) {
        try {
            boolean matches = passwordEncoder.matches(rawPassword, normalizedHash);
            if (!matches && originalHash != null && !originalHash.equals(normalizedHash)) {
                matches = passwordEncoder.matches(rawPassword, originalHash);
            }
            return matches;
        } catch (IllegalArgumentException encoderError) {
            logger.warn("Falha ao validar hash legado: {}", encoderError.getMessage());
            return false;
        }
    }

    private String fetchLegacyPassword(Integer userId) {
        if (userId == null || jdbcTemplate == null) {
            return null;
        }

        try {
            String legacy = jdbcTemplate.queryForObject(
                    "SELECT password FROM users WHERE id = ?",
                    String.class,
                    userId
            );
            return legacy != null ? legacy.trim() : null;
        } catch (BadSqlGrammarException missingColumn) {
            logger.debug("Coluna de senha legada ausente: {}", missingColumn.getMessage());
            return null;
        } catch (DataAccessException dataAccessException) {
            logger.warn("Não foi possível recuperar senha legada para usuário {}: {}",
                    userId,
                    dataAccessException.getMessage());
            return null;
        }
    }

    // ========================================
    // 🔹 CADASTRO
    // ========================================
    public ResponseEntity<?> register(RegisterRequest request) {
        try {
            // Verificar se o email já existe
            String sanitizedEmail = UserSanitizer.normalizeEmail(request.getEmail());

            if (userRepository.findByEmailIgnoreCase(sanitizedEmail) != null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Email já está cadastrado para receber notificações");
                return ResponseEntity.badRequest().body(response);
            }

            // Validação de nome
            String nome = request.getName() != null ? request.getName() : "";

            // Buscar role padrão (USER)
            Role userRole = roleRepository.findByName("USER");
            if (userRole == null) {
                userRole = Role.builder()
                        .name("USER")
                        .build();
                roleRepository.save(userRole);
            }

            // Converter string para enum InvestorProfile
            String investorProfileRaw = request.getInvestorProfile();
            InvestorProfile profile;
            try {
                profile = investorProfileRaw != null
                        ? InvestorProfile.valueOf(investorProfileRaw.trim().toUpperCase())
                        : InvestorProfile.MODERADO;
            } catch (Exception e) {
                profile = InvestorProfile.MODERADO; // valor padrão
            }

            String notificationPreference = UserSanitizer.normalizeNotificationPreference(
                    request.getNotificationPreference()
            );

            String profileImage = null;
            try {
                profileImage = UserSanitizer.sanitizeProfileImage(request.getProfileImageUrl());
            } catch (IllegalArgumentException imageError) {
                Map<String, String> response = new HashMap<>();
                response.put("error", imageError.getMessage());
                return ResponseEntity.badRequest().body(response);
            }

            String encodedPassword = passwordEncoder.encode(request.getPassword());

            // Criar novo usuário
            User newUser = User.builder()
                    .name(nome)
                    .email(sanitizedEmail)
                    .passwordHash(encodedPassword)
                    .role(userRole)
                    .notificationPreference(notificationPreference)
                    .investorProfile(profile)
                    .profileImageUrl(profileImage)
                    .build();

            User savedUser = userRepository.save(newUser);

            // Enviar email de boas-vindas (assíncrono)
            System.out.println("👤 Usuário salvo no banco: " + savedUser.getEmail());
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.enviarEmailBoasVindas(
                            savedUser.getEmail(),
                            savedUser.getName(),
                            savedUser.getInvestorProfile().name(),
                            savedUser.getNotificationPreference()
                    );
                    System.out.println("✅ Email de boas-vindas enviado para: " + savedUser.getEmail());
                } catch (Exception e) {
                    System.err.println("❌ Erro ao enviar email: " + e.getMessage());
                    e.printStackTrace();
                }
            });

            // Gerar token JWT
            var jwtToken = jwtService.generateToken(savedUser.getEmail());

            // Montar resposta
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", savedUser.getId());
            userData.put("name", savedUser.getName());
            userData.put("email", savedUser.getEmail());
            userData.put("notificationPreference", savedUser.getNotificationPreference());
            userData.put("investorProfile", savedUser.getInvestorProfile().name());
            userData.put("profileImageUrl", savedUser.getProfileImageUrl());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Cadastro realizado com sucesso!");
            response.put("token", jwtToken);
            response.put("user", userData);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("Erro no cadastro: ", e);
            Map<String, String> response = new HashMap<>();
            response.put("error", "Erro ao realizar cadastro. Tente novamente.");
            return ResponseEntity.badRequest().body(response);
        }
    }
}