package com.janseva.dto;
public class AuthResponse {
    public String accessToken;
    public String refreshToken;
    public AuthResponse() {}
    public AuthResponse(String a, String r) { this.accessToken=a; this.refreshToken=r; }
}
