package com.bmss.backend.service;

import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ProfileImageStorageService {

    private static final Logger logger = LoggerFactory.getLogger(ProfileImageStorageService.class);
    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:(image/[^;]+);base64,(.+)$", Pattern.CASE_INSENSITIVE);
    private static final long MAX_IMAGE_BYTES = 2_500_000L; // ~2.5 MB

    private final Path storageRoot;
    private final String publicPrefix;

    public ProfileImageStorageService(@Value("${bmss.profile-image.upload-dir:uploads/profile-images}") String uploadDir,
                                      @Value("${bmss.profile-image.public-prefix:/uploads/profile-images}") String publicPrefix) {
        this.storageRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.publicPrefix = publicPrefix.endsWith("/")
                ? publicPrefix.substring(0, publicPrefix.length() - 1)
                : publicPrefix;
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException e) {
            throw new IllegalStateException("Não foi possível preparar o diretório de uploads.", e);
        }
    }

    public boolean isDataUrl(String value) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        return trimmed.regionMatches(true, 0, "data:image", 0, "data:image".length());
    }

    public String storeBase64Image(String base64Value, Integer userId) {
        if (base64Value == null) {
            return null;
        }

        String trimmed = base64Value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(trimmed);
        String payload = trimmed;
        String mimeType = "image/png";

        if (matcher.matches()) {
            mimeType = matcher.group(1).toLowerCase(Locale.ROOT);
            payload = matcher.group(2);
        }

        byte[] data;
        try {
            data = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException decodeError) {
            throw new IllegalArgumentException("A imagem enviada não está em Base64 válido.", decodeError);
        }

        if (data.length == 0) {
            throw new IllegalArgumentException("A imagem enviada está vazia.");
        }

        if (data.length > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Imagem muito grande. Envie um arquivo de até 2.5 MB.");
        }

        String extension = resolveExtension(mimeType, trimmed);
        String fileName = buildFileName(userId, extension);
        Path userFolder = userId != null
                ? storageRoot.resolve(String.valueOf(userId))
                : storageRoot.resolve("common");

        try {
            Files.createDirectories(userFolder);
            Path destination = userFolder.resolve(fileName);
            Files.write(destination, data, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return publicPrefix + "/" + storageRoot.relativize(destination).toString().replace('\\\', '/');
        } catch (IOException ioException) {
            logger.error("Falha ao salvar imagem de perfil", ioException);
            throw new IllegalStateException("Não foi possível salvar a imagem de perfil. Tente novamente mais tarde.", ioException);
        }
    }

    public void deleteStoredImage(String storedValue) {
        if (storedValue == null || storedValue.isBlank()) {
            return;
        }

        if (!storedValue.startsWith(publicPrefix)) {
            return;
        }

        String relative = storedValue.substring(publicPrefix.length());
        if (relative.startsWith("/")) {
            relative = relative.substring(1);
        }

        Path target = storageRoot.resolve(relative).normalize();
        if (!target.startsWith(storageRoot)) {
            return;
        }

        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            logger.warn("Não foi possível remover a imagem antiga: {}", e.getMessage());
        }
    }

    private String buildFileName(Integer userId, String extension) {
        String base = UUID.randomUUID().toString();
        String suffix = userId != null ? "-" + userId : "";
        return base + suffix + "." + extension;
    }

    private String resolveExtension(String mimeType, String original) {
        if (mimeType == null) {
            return "png";
        }

        switch (mimeType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg":
            case "image/jpg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/gif":
                return "gif";
            case "image/webp":
                return "webp";
            default:
                String ext = FilenameUtils.getExtension(original);
                if (ext != null && !ext.isBlank()) {
                    return ext.toLowerCase(Locale.ROOT);
                }
                return "png";
        }
    }
}
