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
import com.bmss.backend.service.ProfileImageStorageService;
import com.bmss.backend.security.PasswordHashUtils.PasswordHashType;
import com.bmss.backend.util.UserSanitizer;
import com.bmss.backend.service.EmailDeliveryResult;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    @Autowired
    private ProfileImageStorageService profileImageStorageService;

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

            String rawPassword = request.getPassword();
            if (rawPassword == null || rawPassword.isBlank()) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            List<String> passwordCandidates = new ArrayList<>();

            if (PasswordHashUtils.isLikelyUsablePassword(user.getPasswordHash())) {
                passwordCandidates.add(user.getPasswordHash());
            }

            if (PasswordHashUtils.isLikelyUsablePassword(user.getLegacyPassword())) {
                passwordCandidates.add(user.getLegacyPassword());
            }

            PasswordMatchResult matchResult = tryMatchCandidates(rawPassword, passwordCandidates);

            boolean shouldAttemptLegacyRecovery = !matchResult.isMatched()
                    && jdbcTemplate != null
                    && !PasswordHashUtils.isLikelyUsablePassword(user.getPasswordHash());

            if (shouldAttemptLegacyRecovery) {
                String recoveredLegacy = fetchLegacyPassword(user.getId());
                if (PasswordHashUtils.isLikelyUsablePassword(recoveredLegacy)) {
                    user.setLegacyPassword(recoveredLegacy);
                    logger.info("Senha legada recuperada para usuário {}", sanitizedEmail);
                    matchResult = tryMatchCandidates(rawPassword, List.of(recoveredLegacy));
                }
            }

            if (!matchResult.isMatched()) {
                throw new BadCredentialsException("Credenciais inválidas");
            }

            String matchedOriginal = matchResult.matchedOriginal();
            String matchedNormalized = matchResult.matchedNormalized();
            PasswordHashType matchedType = matchResult.matchedType();

            boolean hasDelegatingPrefix = PasswordHashUtils.hasDelegatingPrefix(matchedNormalized);
            boolean upgradedHash = passwordEncoder.upgradeEncoding(matchedNormalized)
                    || (!hasDelegatingPrefix && matchedType != PasswordHashType.DELEGATING)
                    || matchedType == PasswordHashType.PLAINTEXT_OR_UNKNOWN;

            boolean storedHashInvalid = !PasswordHashUtils.isLikelyUsablePassword(user.getPasswordHash());
            boolean credentialsUpdated = false;

            if (upgradedHash) {
                String reencoded = passwordEncoder.encode(rawPassword);
                user.setPasswordHash(reencoded);
                credentialsUpdated = true;
                logger.info("Atualizando hash de senha legado ({} -> delegating) para usuário {}",
                        matchedType,
                        sanitizedEmail);
            } else if (storedHashInvalid) {
                user.setPasswordHash(matchedNormalized);
                credentialsUpdated = true;
                logger.info("Normalizando hash de senha armazenado para usuário {}", sanitizedEmail);
            }

            String storedEmail = user.getEmail() != null ? user.getEmail() : "";
            boolean emailNeedsUpdate = !Objects.equals(storedEmail, sanitizedEmail);
            if (emailNeedsUpdate) {
                user.setEmail(sanitizedEmail);
                credentialsUpdated = true;
                logger.info("Corrigindo email com espaços extras para usuário {}", sanitizedEmail);
            }

            if (credentialsUpdated) {
                userRepository.save(user);
            }

            var jwtToken = jwtService.generateToken(user.getEmail());

            String message;
            if (upgradedHash) {
                if (matchedType == PasswordHashType.PLAINTEXT_OR_UNKNOWN) {
                    message = "Login bem-sucedido. Senha criptografada com segurança.";
                } else if (matchedType == PasswordHashType.SHA256) {
                    message = "Login bem-sucedido. Hash de senha modernizado.";
                } else if (matchedType == PasswordHashType.BCRYPT && !PasswordHashUtils.hasDelegatingPrefix(matchedOriginal)) {
                    message = "Login bem-sucedido. Hash BCrypt atualizado.";
                } else {
                    message = "Login bem-sucedido";
                }
            } else if (storedHashInvalid) {
                message = "Login bem-sucedido. Hash de senha normalizado.";
            } else {
                message = "Login bem-sucedido";
            }

            return new AuthResponse(jwtToken, null, message);
        } catch (BadCredentialsException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            throw new BadCredentialsException("Credenciais inválidas", e);
        } catch (Exception e) {
            logger.error("Erro durante o login: ", e);
            throw new BadCredentialsException("Erro durante a autenticação");
        }
    }

    private PasswordMatchResult tryMatchCandidates(String rawPassword, List<String> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return PasswordMatchResult.noMatch();
        }

        for (String candidate : candidates) {
            if (!PasswordHashUtils.isLikelyUsablePassword(candidate)) {
                continue;
            }

            String normalized = PasswordHashUtils.normalizeLegacyHash(candidate);
            if (normalized == null || normalized.isBlank()) {
                continue;
            }

            String trimmedOriginal = candidate.trim();
            if (matchesAgainstKnownHashes(rawPassword, normalized, trimmedOriginal)) {
                PasswordHashType matchedType = PasswordHashUtils.detectHashType(normalized);
                return PasswordMatchResult.matched(trimmedOriginal, normalized, matchedType);
            }
        }

        return PasswordMatchResult.noMatch();
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

    private static final class PasswordMatchResult {
        private final boolean matched;
        private final String matchedOriginal;
        private final String matchedNormalized;
        private final PasswordHashType matchedType;

        private PasswordMatchResult(boolean matched, String matchedOriginal, String matchedNormalized,
                                    PasswordHashType matchedType) {
            this.matched = matched;
            this.matchedOriginal = matchedOriginal;
            this.matchedNormalized = matchedNormalized;
            this.matchedType = matchedType;
        }

        static PasswordMatchResult matched(String matchedOriginal, String matchedNormalized,
                                           PasswordHashType matchedType) {
            return new PasswordMatchResult(true, matchedOriginal, matchedNormalized, matchedType);
        }

        static PasswordMatchResult noMatch() {
            return new PasswordMatchResult(false, null, null, PasswordHashType.EMPTY);
        }

        boolean isMatched() {
            return matched;
        }

        String matchedOriginal() {
            return matchedOriginal;
        }

        String matchedNormalized() {
            return matchedNormalized;
        }

        PasswordHashType matchedType() {
            return matchedType;
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
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> register(RegisterRequest request) {
        User savedUser = null; // Declarar fora do bloco try para evitar o problema

        try {
            // Verificar se o email já existe
            String sanitizedEmail = UserSanitizer.normalizeEmail(request.getEmail());

            if (userRepository.findByEmailIgnoreCase(sanitizedEmail) != null) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Email já está cadastrado para receber notificações");
                return ResponseEntity.badRequest().body(response);
            }

            // Validação de nome
            String nome = request.getName() != null ? request.getName().trim() : "";
            if (nome.isEmpty()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Nome é obrigatório");
                return ResponseEntity.badRequest().body(response);
            }

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

            String rawProfileImage = request.getProfileImageUrl();

            String encodedPassword = passwordEncoder.encode(request.getPassword());

            // Criar novo usuário
            User newUser = User.builder()
                    .name(nome)
                    .email(sanitizedEmail)
                    .passwordHash(encodedPassword)
                    .role(userRole)
                    .notificationPreference(notificationPreference)
                    .investorProfile(profile)
                    .profileImageUrl(null)
                    .build();

            savedUser = userRepository.save(newUser);

            // Criar uma referência final para usar na lambda
            final User finalSavedUser = savedUser;

            if (rawProfileImage != null && !rawProfileImage.trim().isEmpty()) {
                try {
                    String storedValue;
                    if (profileImageStorageService.isDataUrl(rawProfileImage)) {
                        storedValue = profileImageStorageService.storeBase64Image(rawProfileImage, finalSavedUser.getId());
                    } else {
                        storedValue = UserSanitizer.sanitizeProfileImageUrl(rawProfileImage);
                    }
                    finalSavedUser.setProfileImageUrl(storedValue);
                    userRepository.save(finalSavedUser);
                } catch (IllegalArgumentException imageError) {
                    Map<String, String> response = new HashMap<>();
                    response.put("error", imageError.getMessage());
                    return ResponseEntity.badRequest().body(response);
                } catch (IllegalStateException storageError) {
                    Map<String, String> response = new HashMap<>();
                    response.put("error", "Não foi possível salvar a imagem de perfil. Tente novamente com um arquivo menor.");
                    return ResponseEntity.status(500).body(response);
                }
            }

            // Enviar email de boas-vindas (assíncrono)
            logger.info("👤 Usuário salvo no banco: {}", finalSavedUser.getEmail());
            CompletableFuture.runAsync(() -> {
                try {
                    EmailDeliveryResult result = emailService.enviarEmailBoasVindas(
                            finalSavedUser.getEmail(),
                            finalSavedUser.getName(),
                            finalSavedUser.getInvestorProfile().name(),
                            finalSavedUser.getNotificationPreference()
                    );

                    if (result.sent()) {
                        logger.info("✅ Email de boas-vindas enviado para: {} (ID: {})",
                                finalSavedUser.getEmail(),
                                result.providerMessageId());
                    } else {
                        logger.warn("📭 Email de boas-vindas não enviado para {}: {}",
                                finalSavedUser.getEmail(),
                                result.failureReason());
                    }
                } catch (Exception asyncError) {
                    logger.error("❌ Erro inesperado ao acionar envio de email para {}: {}",
                            finalSavedUser.getEmail(),
                            asyncError.getMessage(),
                            asyncError);
                }
            });

            // Gerar token JWT
            var jwtToken = jwtService.generateToken(finalSavedUser.getEmail());

            // Montar resposta
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", finalSavedUser.getId());
            userData.put("name", finalSavedUser.getName());
            userData.put("email", finalSavedUser.getEmail());
            userData.put("notificationPreference", finalSavedUser.getNotificationPreference());
            userData.put("investorProfile", finalSavedUser.getInvestorProfile().name());
            userData.put("profileImageUrl", finalSavedUser.getProfileImageUrl());

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