
package com.bmss.backend.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String name;
    private String profileImageBase64;
}