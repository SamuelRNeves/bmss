package com.bmss.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    // Chave secreta - precisa ter no mínimo 256 bits
    private static final String SECRET_KEY = "my-secret-key-my-secret-key-my-secret-key-my-secret-key";

    // Retorna a chave criptográfica para assinatura e verificação
    private Key getSignInKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    }

    // Gera o token JWT com tempo de expiração de 1 hora
    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60)) // 1 hora
                .signWith(SignatureAlgorithm.HS256, getSignInKey()) // ✅ ordem correta para JJWT 0.11.5
                .compact();
    }

    // Extrai o nome de usuário (email) do token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Verifica se o token é válido comparando o usuário e a expiração
    public boolean isTokenValid(String token, String username) {
        String extractedUsername = extractUsername(token);
        return extractedUsername.equals(username) && !isTokenExpired(token);
    }

    // Verifica se o token está expirado
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Extrai a data de expiração
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Método genérico para extrair qualquer claim (atributo do token)
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = Jwts.parser() // ✅ disponível no JJWT 0.11.5
                .setSigningKey(getSignInKey())
                //.build()
                .parseClaimsJws(token)
                .getBody();
        return claimsResolver.apply(claims);
    }
}
