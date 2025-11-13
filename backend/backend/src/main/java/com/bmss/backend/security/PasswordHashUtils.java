package com.bmss.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Utility helpers for dealing with legacy password hashes that may still live in the database.
 */
public final class PasswordHashUtils {

    private static final Pattern SHA256_PATTERN = Pattern.compile("^[0-9a-fA-F]{64}$");

    private PasswordHashUtils() {
    }

    public enum PasswordHashType {
        DELEGATING,
        BCRYPT,
        SHA256,
        PLAINTEXT_OR_UNKNOWN,
        EMPTY
    }

    public static String normalizeLegacyHash(String rawStoredHash) {
        if (rawStoredHash == null) {
            return null;
        }

        String normalized = rawStoredHash.trim();

        if (normalized.isEmpty()) {
            return normalized;
        }

        if ((normalized.startsWith("\"") && normalized.endsWith("\""))
                || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }

        normalized = normalized
                .replace("\r", "")
                .replace("\n", "")
                .trim();

        if (normalized.isEmpty()) {
            return normalized;
        }

        String lower = normalized.toLowerCase(Locale.ROOT);

        if (lower.startsWith("bcrypt:")) {
            int idx = normalized.indexOf(':');
            normalized = idx >= 0 && idx + 1 < normalized.length()
                    ? normalized.substring(idx + 1).trim()
                    : normalized;
        }

        if (lower.startsWith("bcrypt$")) {
            int idx = normalized.indexOf('$');
            normalized = idx >= 0 ? normalized.substring(idx) : normalized;
        }

        if (lower.startsWith("sha256:")) {
            int idx = normalized.indexOf(':');
            normalized = idx >= 0 && idx + 1 < normalized.length()
                    ? normalized.substring(idx + 1).trim()
                    : normalized;
        }

        if (lower.startsWith("sha-256:")) {
            int idx = normalized.indexOf(':');
            normalized = idx >= 0 && idx + 1 < normalized.length()
                    ? normalized.substring(idx + 1).trim()
                    : normalized;
        }

        return normalized;
    }

    public static PasswordHashType detectHashType(String rawEncodedPassword) {
        if (rawEncodedPassword == null) {
            return PasswordHashType.EMPTY;
        }

        String encoded = rawEncodedPassword.trim();
        if (encoded.isEmpty()) {
            return PasswordHashType.EMPTY;
        }

        if (encoded.startsWith("{") && encoded.contains("}")) {
            return PasswordHashType.DELEGATING;
        }

        if (isBcryptHash(encoded)) {
            return PasswordHashType.BCRYPT;
        }

        if (isSha256Hash(encoded)) {
            return PasswordHashType.SHA256;
        }

        return PasswordHashType.PLAINTEXT_OR_UNKNOWN;
    }

    public static boolean hasDelegatingPrefix(String candidate) {
        if (candidate == null) {
            return false;
        }
        String trimmed = candidate.trim();
        return trimmed.startsWith("{") && trimmed.contains("}");
    }

    public static boolean isBcryptHash(String candidate) {
        return candidate != null && (candidate.startsWith("$2a$")
                || candidate.startsWith("$2b$")
                || candidate.startsWith("$2y$"));
    }

    public static boolean isSha256Hash(String candidate) {
        return candidate != null && SHA256_PATTERN.matcher(candidate).matches();
    }

    public static boolean matchesSha256(CharSequence rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        String expected = sha256Hex(rawPassword);
        return slowEquals(expected, encodedPassword.toLowerCase(Locale.ROOT));
    }

    public static boolean slowEquals(String left, String right) {
        if (left == null || right == null) {
            return false;
        }

        int leftLength = left.length();
        if (leftLength != right.length()) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < leftLength; i++) {
            result |= left.charAt(i) ^ right.charAt(i);
        }

        return result == 0;
    }

    public static String sha256Hex(CharSequence rawPassword) {
        if (rawPassword == null) {
            throw new IllegalArgumentException("Senha inválida");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawPassword.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hashed.length * 2);
            for (byte b : hashed) {
                builder.append(String.format(Locale.ROOT, "%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Algoritmo SHA-256 não disponível", e);
        }
    }
}