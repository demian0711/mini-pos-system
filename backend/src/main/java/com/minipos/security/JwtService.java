package com.minipos.security;

import com.minipos.model.Role;
import com.minipos.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private static final String ISSUER = "mini-pos";
    private final SecretKey key;
    private final Duration ttl;
    private final JwtParser parser;

    public JwtService(@Value("${app.jwt.secret}") String secret, @Value("${app.jwt.ttl}") Duration ttl) {
        this.key = secret.isBlank() ? Jwts.SIG.HS256.key().build()
                : Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret.strip()));
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("JWT_TTL must be positive");
        }
        this.ttl = ttl;
        this.parser = Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build();
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(user.getUsername())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    TokenIdentity parse(String token) {
        Claims claims = parser.parseSignedClaims(token).getPayload();
        String username = claims.getSubject();
        String role = claims.get("role", String.class);
        if (username == null || username.isBlank() || role == null || claims.getExpiration() == null) {
            throw new IllegalArgumentException("Incomplete token");
        }
        return new TokenIdentity(username, Role.valueOf(role));
    }

    record TokenIdentity(String username, Role role) {
    }
}
