package com.bmss.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class NoticiasResponseDTO {
    private List<FeedDTO> items = new ArrayList<>();
    private boolean fromCache;
    private boolean usingFallback;
    private String fallbackSource;
    private boolean partial;
    private String message;
    private List<String> warnings = new ArrayList<>();
    private List<String> errors = new ArrayList<>();
}
