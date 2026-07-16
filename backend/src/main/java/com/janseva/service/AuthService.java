package com.janseva.service;

import com.janseva.dto.AuthRequest;
import com.janseva.dto.AuthResponse;
import com.janseva.dto.RefreshRequest;
import com.janseva.dto.RegisterRequest;
import com.janseva.dto.UserResponse;
import com.janseva.entity.RefreshSession;
import com.janseva.entity.User;
import com.janseva.exception.ApiException;
import com.janseva.repository.RefreshSessionRepository;
import com.janseva.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class AuthService {
    private final UserRepository userRepo;
    private final RefreshSessionRepository refreshRepo;
    private final EncryptionService encryptionService;
    private final Argon2PasswordEncoder encoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${janseva.security.jwt-secret}")
    private String jwtSecret;

    public AuthService(UserRepository userRepo, RefreshSessionRepository refreshRepo, EncryptionService encryptionService) {
        this.userRepo = userRepo;
        this.refreshRepo = refreshRepo;
        this.encryptionService = encryptionService;
        this.encoder = new Argon2PasswordEncoder(16, 32, 1, 4096, 3);
    }

    public AuthResponse register(RegisterRequest req) {
        // Validate password complexity
        validatePasswordStrength(req.password);

        // Check for duplicate email
        String normalizedEmail = req.email.toLowerCase();
        if (userRepo.findByEmail(normalizedEmail).isPresent()) {
            throw new ApiException("DUPLICATE_EMAIL", HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        User u = new User();
        u.name = req.name;
        u.email = normalizedEmail;
        u.passwordHash = encoder.encode(req.password);
        u.role = "CITIZEN";
        u.active = true;
        u.createdAt = OffsetDateTime.now();
        u.updatedAt = OffsetDateTime.now();

        // Encrypt phone if provided
        if (req.phone != null && !req.phone.isBlank()) {
            try {
                u.phoneCipher = encryptionService.encrypt(req.phone);
            } catch (Exception e) {
                // Log but don't fail registration
            }
        }

        userRepo.save(u);
        return generateTokens(u);
    }

    public AuthResponse login(AuthRequest req) {
        // Use same error message for both cases to prevent email enumeration
        String errorMsg = "Invalid email or password.";
        User u = userRepo.findByEmail(req.email.toLowerCase())
                .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, errorMsg));

        if (!u.active) {
            throw new ApiException("ACCOUNT_DISABLED", HttpStatus.UNAUTHORIZED, errorMsg);
        }

        if (!encoder.matches(req.password, u.passwordHash)) {
            throw new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, errorMsg);
        }

        return generateTokens(u);
    }

    public AuthResponse refresh(RefreshRequest req) {
        if (req.refreshToken == null || req.refreshToken.isBlank()) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Refresh token is required.");
        }

        String tokenHash = sha256Hex(req.refreshToken);
        RefreshSession session = refreshRepo.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Invalid refresh token."));

        // Check if revoked
        if (session.revokedAt != null) {
            throw new ApiException("TOKEN_REVOKED", HttpStatus.UNAUTHORIZED, "Refresh token has been revoked.");
        }

        // Check if expired
        if (session.expiresAt.isBefore(OffsetDateTime.now())) {
            throw new ApiException("TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED, "Refresh token has expired.");
        }

        // Revoke old session
        session.revokedAt = OffsetDateTime.now();

        // Get user
        User user = userRepo.findById(session.userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.UNAUTHORIZED, "User not found."));

        // Generate new tokens
        AuthResponse response = generateTokens(user);

        // Link old session to new one
        String newTokenHash = sha256Hex(response.refreshToken);
        RefreshSession newSession = refreshRepo.findByTokenHash(newTokenHash).orElse(null);
        if (newSession != null) {
            session.replacedBy = newSession.id;
        }
        refreshRepo.save(session);

        return response;
    }

    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return; // Silent logout
        }
        String tokenHash = sha256Hex(refreshToken);
        refreshRepo.findByTokenHash(tokenHash).ifPresent(session -> {
            session.revokedAt = OffsetDateTime.now();
            refreshRepo.save(session);
        });
    }

    public UserResponse getCurrentUser(UUID userId) {
        User u = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found."));
        return new UserResponse(
            u.id.toString(),
            u.name,
            u.email,
            u.role,
            u.departmentCode,
            u.active,
            u.createdAt != null ? u.createdAt.toString() : null
        );
    }

    /**
     * Create a staff user (for admin bootstrap and admin controller).
     */
    public User createStaffUser(String name, String email, String password, String role, String departmentCode) {
        validatePasswordStrength(password);
        String normalizedEmail = email.toLowerCase();
        if (userRepo.findByEmail(normalizedEmail).isPresent()) {
            throw new ApiException("DUPLICATE_EMAIL", HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User u = new User();
        u.name = name;
        u.email = normalizedEmail;
        u.passwordHash = encoder.encode(password);
        u.role = role;
        u.departmentCode = departmentCode;
        u.active = true;
        u.createdAt = OffsetDateTime.now();
        u.updatedAt = OffsetDateTime.now();
        return userRepo.save(u);
    }

    private AuthResponse generateTokens(User u) {
        // Generate JWT access token (15 minutes)
        String accessToken = Jwts.builder()
            .setSubject(u.id.toString())
            .claim("role", u.role)
            .claim("dept", u.departmentCode)
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + 15 * 60 * 1000))
            .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
            .compact();

        // Generate real refresh token (32 random bytes -> hex)
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String refreshToken = bytesToHex(randomBytes);

        // Hash and store refresh session
        String tokenHash = sha256Hex(refreshToken);
        RefreshSession session = new RefreshSession();
        session.userId = u.id;
        session.tokenHash = tokenHash;
        session.expiresAt = OffsetDateTime.now().plusDays(7);
        session.createdAt = OffsetDateTime.now();
        refreshRepo.save(session);

        return new AuthResponse(accessToken, refreshToken);
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 12) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                "Password must be at least 12 characters.",
                Map.of("password", "Password must be at least 12 characters."));
        }
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSymbol = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSymbol = true;
        }
        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
            throw new ApiException("WEAK_PASSWORD", HttpStatus.BAD_REQUEST,
                "Password must contain uppercase, lowercase, digit and symbol.",
                Map.of("password", "Password must contain uppercase, lowercase, digit and symbol."));
        }
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
