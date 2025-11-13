package com.bmss.backend.security;

import com.bmss.backend.security.PasswordHashUtils.PasswordHashType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_AUTH_ENDPOINTS = {
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/auth/login",
            "/auth/register"
    };

    private static final String[] PROTECTED_ENDPOINTS = {
            "/api/v1/auth/me",
            "/auth/me",
            "/api/v1/users/**",
            "/users/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService customUserDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CustomUserDetailsService customUserDetailsService) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors()
                .and()
                .csrf().disable()
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_AUTH_ENDPOINTS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/").permitAll()
                        .requestMatchers(PROTECTED_ENDPOINTS).authenticated()
                        .anyRequest().permitAll()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        PasswordEncoder delegating = PasswordEncoderFactories.createDelegatingPasswordEncoder();
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

        return new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return delegating.encode(rawPassword);
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                if (encodedPassword == null) {
                    return false;
                }

                String normalized = PasswordHashUtils.normalizeLegacyHash(encodedPassword);
                if (normalized == null || normalized.isEmpty()) {
                    return false;
                }

                PasswordHashType type = PasswordHashUtils.detectHashType(normalized);
                boolean matches = switch (type) {
                    case DELEGATING -> delegating.matches(rawPassword, normalized);
                    case BCRYPT -> bcrypt.matches(rawPassword, normalized);
                    case SHA256 -> PasswordHashUtils.matchesSha256(rawPassword, normalized);
                    case PLAINTEXT_OR_UNKNOWN -> PasswordHashUtils.slowEquals(
                            normalized,
                            rawPassword == null ? null : rawPassword.toString()
                    );
                    case EMPTY -> false;
                };

                if (!matches) {
                    String trimmedOriginal = encodedPassword == null ? null : encodedPassword.trim();
                    if (trimmedOriginal != null && !trimmedOriginal.equals(normalized)) {
                        PasswordHashType fallbackType = PasswordHashUtils.detectHashType(trimmedOriginal);
                        matches = switch (fallbackType) {
                            case DELEGATING -> delegating.matches(rawPassword, trimmedOriginal);
                            case BCRYPT -> bcrypt.matches(rawPassword, trimmedOriginal);
                            case SHA256 -> PasswordHashUtils.matchesSha256(rawPassword, trimmedOriginal);
                            case PLAINTEXT_OR_UNKNOWN -> PasswordHashUtils.slowEquals(
                                    trimmedOriginal,
                                    rawPassword == null ? null : rawPassword.toString()
                            );
                            case EMPTY -> false;
                        };
                    }
                }

                return matches;
            }

            @Override
            public boolean upgradeEncoding(String encodedPassword) {
                if (encodedPassword == null) {
                    return true;
                }

                String normalized = PasswordHashUtils.normalizeLegacyHash(encodedPassword);
                if (normalized == null || normalized.isEmpty()) {
                    return true;
                }

                PasswordHashType type = PasswordHashUtils.detectHashType(normalized);
                return switch (type) {
                    case DELEGATING -> false;
                    case BCRYPT -> true;
                    case SHA256 -> true;
                    case PLAINTEXT_OR_UNKNOWN -> true;
                    case EMPTY -> true;
                };
            }
        };
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(customUserDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}