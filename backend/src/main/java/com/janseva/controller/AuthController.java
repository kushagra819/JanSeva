package com.janseva.controller;

import com.janseva.dto.*;
import com.janseva.service.AuthService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody RefreshRequest req) {
        return authService.refresh(req);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(@RequestBody(required = false) RefreshRequest req) {
        if (req != null) {
            authService.logout(req.refreshToken);
        }
        return Map.of("message", "Logged out successfully.");
    }

    @GetMapping("/me")
    public UserResponse me(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return authService.getCurrentUser(userId);
    }
}
