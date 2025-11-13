// src/main/java/com/bmss/backend/service/ImageUploadService.java
package com.bmss.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ImageUploadService {

    private final Cloudinary cloudinary;

    public ImageUploadService(
        @Value("${cloudinary.cloud-name}") String cloudName,
        @Value("${cloudinary.api-key}") String apiKey,
        @Value("${cloudinary.api-secret}") String apiSecret
    ) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
            "cloud_name", cloudName,
            "api_key", apiKey,
            "api_secret", apiSecret
        ));
    }

    public String uploadProfileImage(String base64Image) {
        try {
            // Remove prefixo data:image/...;base64,
            String cleanBase64 = base64Image.replaceFirst("^data:image/[^;]+;base64,", "");

            Map uploadResult = cloudinary.uploader().upload(
                "data:image/jpeg;base64," + cleanBase64,
                ObjectUtils.asMap(
                    "folder", "bmss/profiles",
                    "resource_type", "image",
                    "transformation", "c_thumb,w_400,h_400,g_face"
                )
            );

            return (String) uploadResult.get("secure_url");
        } catch (Exception e) {
            throw new RuntimeException("Falha ao fazer upload da imagem", e);
        }
    }
}