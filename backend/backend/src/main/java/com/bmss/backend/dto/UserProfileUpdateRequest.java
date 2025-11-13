package com.bmss.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileUpdateRequest {
    private String investorProfile;
    private String notificationPreference;
    @JsonAlias("profileImageUrl")
    private String profileImage;
}
