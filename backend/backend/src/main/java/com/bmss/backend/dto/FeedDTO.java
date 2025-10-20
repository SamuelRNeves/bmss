package com.bmss.backend.dto;

import lombok.Data;

@Data
public class FeedDTO {
    private String title;
    private String description;
    private String url;
    private String source;
    private String publishedAt;
    private String sentimento;
    private Double score;
}
