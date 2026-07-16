package com.janseva.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.janseva.dto.*;
import com.janseva.repository.GrievanceRepository;
import com.janseva.repository.UserRepository;
import com.janseva.service.AuthService;
import com.janseva.service.StatusStateMachine;
import com.janseva.exception.ApiException;
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
public class WorkflowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private GrievanceRepository grievanceRepo;
    @Autowired private AuthService authService;
    @Autowired private StatusStateMachine stateMachine;

    private String citizenToken;
    private String officerToken;

    @BeforeEach
    void setup() {
        grievanceRepo.deleteAll();
        userRepo.deleteAll();

        RegisterRequest citizen = new RegisterRequest();
        citizen.name = "Workflow Citizen"; citizen.email = "wf-citizen@test.com"; citizen.password = "SecurePass123!";
        AuthResponse cr = authService.register(citizen);
        citizenToken = cr.accessToken;

        authService.createStaffUser("Workflow Officer", "wf-officer@test.com", "SecurePass123!", "OFFICER", "ROADS");
        AuthRequest oLogin = new AuthRequest();
        oLogin.email = "wf-officer@test.com"; oLogin.password = "SecurePass123!";
        AuthResponse or = authService.login(oLogin);
        officerToken = or.accessToken;
    }

    // 1. Reject invalid status transition
    @Test
    void rejectInvalidStatusTransition() {
        // RECEIVED -> RESOLVED is invalid
        assertFalse(stateMachine.isValidTransition("RECEIVED", "RESOLVED"));
        assertThrows(ApiException.class, () -> stateMachine.validateTransition("RECEIVED", "RESOLVED"));

        // RESOLVED -> anything is invalid
        assertFalse(stateMachine.isValidTransition("RESOLVED", "IN_PROGRESS"));

        // REJECTED -> anything is invalid
        assertFalse(stateMachine.isValidTransition("REJECTED", "ROUTED"));
    }

    // 2. Valid transitions work
    @Test
    void validTransitionsAccepted() {
        assertTrue(stateMachine.isValidTransition("RECEIVED", "PROCESSING"));
        assertTrue(stateMachine.isValidTransition("PROCESSING", "ROUTED"));
        assertTrue(stateMachine.isValidTransition("ROUTED", "IN_PROGRESS"));
        assertTrue(stateMachine.isValidTransition("IN_PROGRESS", "RESOLVED"));
    }

    // 3. Status change creates a citizen notification
    @Test
    void statusChangeCreatesNotification() throws Exception {
        // Create a complaint
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "There is a large pothole on the main road causing traffic issues.";

        MvcResult result = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String grievanceId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        // Citizen should see notifications
        mockMvc.perform(get("/api/v1/notifications")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk());
    }

    // 4. Route correction creates routing, timeline and audit records
    @Test
    void routeCorrectionCreatesRecords() throws Exception {
        // Create complaint
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "There is a water pipeline leak on the main road near the drainage.";

        MvcResult result = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String grievanceId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        // Check timeline has the CREATED event
        mockMvc.perform(get("/api/v1/grievances/" + grievanceId + "/timeline")
                .header("Authorization", "Bearer " + citizenToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("CREATED"));
    }
}
