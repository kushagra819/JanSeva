package com.janseva.dto;
public class AuthResponse {
    public String accessToken;
    public String refreshToken;
    public UserResponse user;
    public AuthResponse() {}
    public AuthResponse(String accessToken, String refreshToken, UserResponse user) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;
    }
}
