package com.bmss.backend.dto;

import lombok.Data;

@Data
public class PasswordChangeRequest {
    private String currentPassword;
    private String newPassword;
    private String confirmPassword;
}
