package com.bmss.backend.dto;

import com.bmss.backend.model.InvestorProfile;
import com.bmss.backend.model.Role;
import com.bmss.backend.model.User;
import lombok.Builder;
import lombok.Value;

import java.util.Optional;

@Value
@Builder
public class AuthMeResponse {
    Integer id;
    String name;
    String email;
    String notificationPreference;
    String investorProfile;
    String role;

    public static AuthMeResponse fromUser(User user) {
        String resolvedInvestorProfile = Optional.ofNullable(user.getInvestorProfile())
                .map(InvestorProfile::name)
                .orElse(InvestorProfile.MODERADO.name());

        String resolvedRole = Optional.ofNullable(user.getRole())
                .map(Role::getName)
                .orElse("USER");

        return AuthMeResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .notificationPreference(user.getNotificationPreference())
                .investorProfile(resolvedInvestorProfile)
                .role(resolvedRole)
                .build();
    }
}
