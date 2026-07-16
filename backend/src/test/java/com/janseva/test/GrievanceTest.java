package com.janseva.test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.janseva.dto.*;
import com.janseva.repository.UserRepository;
import com.janseva.service.AuthService;
import com.janseva.service.HeuristicClassifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
public class GrievanceTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepo;
    @Autowired private AuthService authService;
    @Autowired private HeuristicClassifier heuristicClassifier;

    private String citizenToken;

    @BeforeEach
    void setup() {
        userRepo.deleteAll();

        RegisterRequest reg = new RegisterRequest();
        reg.name = "Test Citizen";
        reg.email = "grievance@test.com";
        reg.password = "SecurePass123!";
        AuthResponse resp = authService.register(reg);
        citizenToken = resp.accessToken;
    }

    // 1. Reject complaint shorter than 10 characters
    @Test
    void rejectShortComplaint() throws Exception {
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "short";

        mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // 2. Idempotency key returns the original complaint
    @Test
    void idempotencyKeyReturnsOriginal() throws Exception {
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "There is a pothole on the main road near my house causing accidents.";
        req.idempotencyKey = "unique-key-12345";

        // First submission
        MvcResult first = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asText();

        // Second submission with same key
        MvcResult second = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asText();

        assertEquals(firstId, secondId, "Idempotency key should return the same grievance.");
    }

    // 3. Heuristic fallback: normal complaint routing by confidence
    @Test
    void normalComplaintRoutedByHeuristic() {
        AiAnalysisResponse resp = heuristicClassifier.classify("test-id", "There is a big pothole on the road");
        assertNotNull(resp);
        assertEquals("ROADS", resp.departmentCode);
        assertEquals("heuristic-fallback", resp.provider);
        assertTrue(resp.requiresHumanReview, "Heuristic fallback should require human review");
    }

    // 4. Emergency detection by heuristic
    @Test
    void emergencyDetected() {
        AiAnalysisResponse resp = heuristicClassifier.classify("test-id",
            "There is an emergency! Electrical sparking near school, danger of electrocution!");
        assertEquals("EMERGENCY", resp.priority);
        assertTrue(resp.requiresHumanReview);
        assertFalse(resp.urgentReasons.isEmpty());
    }

    // 5. Analysis contains three predictions and model version
    @Test
    void analysisHasThreePredictions() {
        AiAnalysisResponse resp = heuristicClassifier.classify("test-id", "Water pipeline leak on the road near drain");
        assertNotNull(resp.topPredictions);
        assertEquals(3, resp.topPredictions.size());
        assertNotNull(resp.modelVersion);
        assertNotNull(resp.provider);
    }

    // 6. AI-service failure activates fallback
    @Test
    void aiFallbackActivated() throws Exception {
        // Create a complaint
        CreateGrievanceRequest req = new CreateGrievanceRequest();
        req.text = "The road near my house has many potholes causing accidents.";

        MvcResult result = mockMvc.perform(post("/api/v1/grievances")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String grievanceId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        // Analyze (AI service is down in test, should use heuristic fallback)
        MvcResult analyzeResult = mockMvc.perform(post("/api/v1/grievances/" + grievanceId + "/analyze")
                .header("Authorization", "Bearer " + citizenToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("text", req.text))))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = analyzeResult.getResponse().getContentAsString();
        assertTrue(responseBody.contains("heuristic-fallback") || responseBody.contains("departmentCode"),
            "Should return a valid analysis response via fallback");
    }
}
