package com.bmss.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedDTO {
    private String title;
    private String description;
    private String url;
    private String source;
    private String publishedAt;
    private String sentimento;
    private Double score;
    private boolean isTweet;
    private String tweetUrl;
}
