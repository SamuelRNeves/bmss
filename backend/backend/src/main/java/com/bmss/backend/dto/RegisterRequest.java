package com.bmss.backend.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private String notificationPreference;
    private String investorProfile; // ✅ agora String
    private String profileImageUrl;
}

