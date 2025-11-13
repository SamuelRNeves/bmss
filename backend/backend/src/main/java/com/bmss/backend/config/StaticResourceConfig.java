package com.bmss.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private final String uploadDir;
    private final String publicPrefix;

    public StaticResourceConfig(
            @Value("${bmss.profile-image.upload-dir:uploads/profile-images}") String uploadDir,
            @Value("${bmss.profile-image.public-prefix:/uploads/profile-images}") String publicPrefix
    ) {
        this.uploadDir = uploadDir;
        this.publicPrefix = publicPrefix;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String resourcePattern = publicPrefix.endsWith("/") ? publicPrefix + "**" : publicPrefix + "/**";
        String location = uploadPath.toUri().toString();
        registry.addResourceHandler(resourcePattern)
                .addResourceLocations(location)
                .setCachePeriod(3600);
    }
}
