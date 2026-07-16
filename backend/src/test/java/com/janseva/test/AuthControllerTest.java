package com.janseva.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.janseva.dto.*;
import com.janseva.entity.User;
import com.janseva.repository.UserRepository;
import com.janseva.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;

    @BeforeEach
    void setup() {
        userRepo.deleteAll();
    }

    // 1. Register valid citizen
    @Test
    void registerValidCitizen() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.name = "Test User";
        req.email = "citizen@test.com";
        req.password = "SecurePass123!";

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();

        // Verify user was created
        assertTrue(userRepo.findByEmail("citizen@test.com").isPresent());
    }

    // 2. Reject duplicate email
    @Test
    void rejectDuplicateEmail() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.name = "First User";
        req.email = "duplicate@test.com";
        req.password = "SecurePass123!";

        // First registration should succeed
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Second registration with same email should fail
        req.name = "Second User";
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_EMAIL"));
    }

    // 3. Reject weak password
    @Test
    void rejectWeakPassword() throws Exception {
        RegisterRequest req = new RegisterRequest();
        req.name = "Test User";
        req.email = "weak@test.com";
        req.password = "short";

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // 4. Authenticate valid credentials
    @Test
    void authenticateValidCredentials() throws Exception {
        // Register first
        RegisterRequest reg = new RegisterRequest();
        reg.name = "Login User";
        reg.email = "login@test.com";
        reg.password = "SecurePass123!";

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk());

        // Login
        AuthRequest login = new AuthRequest();
        login.email = "login@test.com";
        login.password = "SecurePass123!";

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
    }

    // 5. Reject invalid credentials without revealing whether email exists
    @Test
    void rejectInvalidCredentialsNoEmailLeak() throws Exception {
        AuthRequest login = new AuthRequest();
        login.email = "nonexistent@test.com";
        login.password = "SecurePass123!";

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andReturn();

        // Should not reveal whether email exists
        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("not found"));
        assertFalse(body.contains("does not exist"));
    }

    // 6. Refresh rotates the session
    @Test
    void refreshRotatesSession() throws Exception {
        // Register
        RegisterRequest reg = new RegisterRequest();
        reg.name = "Refresh User";
        reg.email = "refresh@test.com";
        reg.password = "SecurePass123!";

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResp = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);
        String originalRefresh = authResp.refreshToken;

        // Refresh
        RefreshRequest refreshReq = new RefreshRequest();
        refreshReq.refreshToken = originalRefresh;

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();

        AuthResponse newResp = objectMapper.readValue(refreshResult.getResponse().getContentAsString(), AuthResponse.class);

        // New tokens should be different
        assertNotEquals(originalRefresh, newResp.refreshToken);

        // Old refresh token should no longer work
        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(refreshReq)))
                .andExpect(status().isUnauthorized());
    }

    // 7. Logout revokes the session
    @Test
    void logoutRevokesSession() throws Exception {
        // Register
        RegisterRequest reg = new RegisterRequest();
        reg.name = "Logout User";
        reg.email = "logout@test.com";
        reg.password = "SecurePass123!";

        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResp = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);

        // Logout
        RefreshRequest logoutReq = new RefreshRequest();
        logoutReq.refreshToken = authResp.refreshToken;

        mockMvc.perform(post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isOk());

        // Refresh should fail after logout
        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(logoutReq)))
                .andExpect(status().isUnauthorized());
    }

    // 8. Expired access token is rejected
    @Test
    void expiredAccessTokenRejected() throws Exception {
        // Use a fake/expired token
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer expired.token.here"))
                .andExpect(status().isForbidden());
    }
}
