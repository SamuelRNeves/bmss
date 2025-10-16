
package com.bmss.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FeedDTO {
    private String title;
    private String description;
    private String url;
    private String source;
    private String publishedAt;
}
