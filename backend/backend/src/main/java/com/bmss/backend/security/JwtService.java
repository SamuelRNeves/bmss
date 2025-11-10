package com.bmss.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    // ✅ Chave configurada via application.properties
    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getSignInKey() {
        // Garante chave forte (>= 256 bits)
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24)) // 24h
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, String username) {
        final String extractedUsername = extractUsername(token);
        return (extractedUsername.equals(username)) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSignInKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            System.err.println("❌ Erro ao extrair claims do token: " + e.getMessage());
            throw new IllegalStateException("Token inválido ou expirado: " + e.getMessage());
        }
    }

    public String extractUsernameFromAuthHeader(String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException("Authorization header inválido");
            }

            String token = authHeader.substring(7).trim();
            if (token.isEmpty()) {
                throw new IllegalArgumentException("Token vazio");
            }

            return extractUsername(token);

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            System.err.println("⚠️ Token expirado: " + e.getMessage());
            throw new IllegalStateException("Token expirado");
        } catch (Exception e) {
            System.err.println("❌ Erro ao processar token: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            throw new IllegalStateException("Token inválido: " + e.getMessage());
        }
    }
}
