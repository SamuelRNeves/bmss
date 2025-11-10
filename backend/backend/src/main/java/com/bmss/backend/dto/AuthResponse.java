package com.bmss.backend.dto;

import com.bmss.backend.model.InvestorProfile;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class AuthResponse {
    private String token;
    
}
