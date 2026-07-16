import os
from pathlib import Path

def create_file(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

create_file("backend/src/main/java/com/janseva/service/EncryptionService.java", """
package com.janseva.service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {
    @Value("${janseva.security.encryption-key}")
    private String encryptionKey;

    public String encrypt(String plainText) throws Exception {
        if(plainText == null) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        byte[] nonce = new byte[12];
        new SecureRandom().nextBytes(nonce);
        GCMParameterSpec spec = new GCMParameterSpec(128, nonce);
        SecretKeySpec key = new SecretKeySpec(encryptionKey.getBytes(), "AES");
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);
        byte[] cipherText = cipher.doFinal(plainText.getBytes());
        byte[] encrypted = new byte[nonce.length + cipherText.length];
        System.arraycopy(nonce, 0, encrypted, 0, nonce.length);
        System.arraycopy(cipherText, 0, encrypted, nonce.length, cipherText.length);
        return "v1:" + Base64.getEncoder().encodeToString(encrypted);
    }
    
    public String decrypt(String cipherText) throws Exception {
        if(cipherText == null) return null;
        String[] parts = cipherText.split(":");
        byte[] decoded = Base64.getDecoder().decode(parts[1]);
        byte[] nonce = new byte[12];
        System.arraycopy(decoded, 0, nonce, 0, 12);
        GCMParameterSpec spec = new GCMParameterSpec(128, nonce);
        SecretKeySpec key = new SecretKeySpec(encryptionKey.getBytes(), "AES");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, spec);
        byte[] plainText = cipher.doFinal(decoded, 12, decoded.length - 12);
        return new String(plainText);
    }
}
""")

create_file("backend/src/main/java/com/janseva/service/AuthService.java", """
package com.janseva.service;
import com.janseva.dto.AuthRequest;
import com.janseva.dto.AuthResponse;
import com.janseva.dto.RegisterRequest;
import com.janseva.entity.User;
import com.janseva.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import java.util.Date;
import java.nio.charset.StandardCharsets;

@Service
public class AuthService {
    private final UserRepository userRepo;
    private final Argon2PasswordEncoder encoder;
    
    @Value("${janseva.security.jwt-secret}")
    private String jwtSecret;
    
    public AuthService(UserRepository userRepo) {
        this.userRepo = userRepo;
        this.encoder = new Argon2PasswordEncoder(16, 32, 1, 4096, 3);
    }

    public AuthResponse register(RegisterRequest req) {
        User u = new User();
        u.name = req.name;
        u.email = req.email.toLowerCase();
        u.passwordHash = encoder.encode(req.password);
        u.role = "CITIZEN";
        userRepo.save(u);
        return generateTokens(u);
    }

    public AuthResponse login(AuthRequest req) {
        User u = userRepo.findByEmail(req.email.toLowerCase()).orElseThrow(() -> new RuntimeException("Invalid credentials"));
        if(!encoder.matches(req.password, u.passwordHash)) {
            throw new RuntimeException("Invalid credentials");
        }
        return generateTokens(u);
    }

    private AuthResponse generateTokens(User u) {
        String token = Jwts.builder()
            .setSubject(u.id.toString())
            .claim("role", u.role)
            .claim("dept", u.departmentCode)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000)) // 15 mins
            .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
            .compact();
        return new AuthResponse(token, "refresh-token-mock");
    }
}
""")

print("Services scaffolded.")
