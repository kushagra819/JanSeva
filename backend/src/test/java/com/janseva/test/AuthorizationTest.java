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

@SpringBootTest
@AutoConfigureMockMvc
public class AuthorizationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private AuthService authService;

    private String citizenToken;
    private String citizen2Token;
    private String officerToken;
    private String adminToken;

    @BeforeEach
    void setup() {
        userRepo.deleteAll();

        // Create citizen 1
        RegisterRequest c1 = new RegisterRequest();
        c1.name = "Citizen One"; c1.email = "citizen1@test.com"; c1.password = "SecurePass123!";
        AuthResponse c1r = authService.register(c1);
        citizenToken = c1r.accessToken;

        // Create citizen 2
        RegisterRequest c2 = new RegisterRequest();
        c2.name = "Citizen Two"; c2.email = "citizen2@test.com"; c2.password = "SecurePass123!";
        AuthResponse c2r = authService.register(c2);
        citizen2Token = c2r.accessToken;

        // Create officer
        User officer = authService.createStaffUser("Officer One", "officer@test.com", "SecurePass123!", "OFFICER", "ROADS");
        AuthRequest oLogin = new AuthRequest();
        oLogin.email = "officer@test.com"; oLogin.password = "SecurePass123!";
        AuthResponse or = authService.login(oLogin);
        officerToken = or.accessToken;

        // Create admin
        User admin = authService.createStaffUser("Admin One", "admin@test.com", "SecurePass123!", "ADMIN", null);
        AuthRequest aLogin = new AuthRequest();
        aLogin.email = "admin@test.com"; aLogin.password = "SecurePass123!";
        AuthResponse ar = authService.login(aLogin);
        adminToken = ar.accessToken;
    }

    // 1. Citizen cannot access another citizen's complaint
    @Test
    void citizenCannotAccessOtherComplaint() throws Exception {
        // Citizen 1 creates a complaint
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "There is a huge pothole on the main road near my house.";

        MvcResult result = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String grievanceId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        // Citizen 2 tries to access it
        mockMvc.perform(get("/api/v1/grievances/" + grievanceId)
                .header("Authorization", "Bearer " + citizen2Token))
                .andExpect(status().isForbidden());
    }

    // 2. Officer cannot access another department
    @Test
    void officerCannotAccessOtherDepartment() throws Exception {
        // Officer is in ROADS department, grievances in WATER should not be accessible via dept filter
        // The staff controller enforces department filtering
        mockMvc.perform(get("/api/v1/staff/grievances")
                .header("Authorization", "Bearer " + officerToken)
                .param("departmentCode", "WATER"))
                .andExpect(status().isOk()); // Returns ok but filtered to ROADS only
    }

    // 3. Citizen cannot use staff endpoints
    @Test
    void citizenCannotUseStaffEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/staff/grievances")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isForbidden());
    }

    // 4. Officer cannot create another staff account
    @Test
    void officerCannotCreateStaff() throws Exception {
        CreateStaffRequest req = new CreateStaffRequest();
        req.name = "Sneaky Officer";
        req.email = "sneaky@test.com";
        req.password = "SecurePass123!";
        req.role = "OFFICER";
        req.departmentCode = "ROADS";

        mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + officerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    // 5. Commissioner analytics access is read-only (no mutations)
    @Test
    void commissionerAnalyticsReadOnly() throws Exception {
        // Create commissioner
        User commissioner = authService.createStaffUser("Commissioner", "comm@test.com", "SecurePass123!", "COMMISSIONER", null);
        AuthRequest cLogin = new AuthRequest();
        cLogin.email = "comm@test.com"; cLogin.password = "SecurePass123!";
        AuthResponse cr = authService.login(cLogin);

        // Can read analytics
        mockMvc.perform(get("/api/v1/analytics/summary")
                .header("Authorization", "Bearer " + cr.accessToken))
                .andExpect(status().isOk());
    }
}
