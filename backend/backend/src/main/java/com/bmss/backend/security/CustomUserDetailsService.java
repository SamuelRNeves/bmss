package com.bmss.backend.security;

import com.bmss.backend.model.User;
import com.bmss.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.trim().isEmpty()) {
            throw new UsernameNotFoundException("Usuário não encontrado com email: " + email);
        }

        String sanitizedEmail = email.trim().toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmailIgnoreCase(sanitizedEmail);
        if (user == null) {
            user = userRepository.findByEmailNormalized(sanitizedEmail);
        }

        if (user == null) {
            throw new UsernameNotFoundException("Usuário não encontrado com email: " + email);
        }

        if (!sanitizedEmail.equals(user.getEmail())) {
            user.setEmail(sanitizedEmail);
            userRepository.save(user);
        }

        String roleName = user.getRole() != null ? user.getRole().getName() : "USER";

        String resolvedPassword = user.getResolvedPasswordHash();
        if (resolvedPassword == null || resolvedPassword.trim().isEmpty()) {
            throw new UsernameNotFoundException("Usuário não encontrado com email: " + email);
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(resolvedPassword.trim())
                .roles(roleName)
                .build();
    }
}