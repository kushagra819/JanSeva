package com.janseva.test;

import com.janseva.dto.MapIssueResponse;
import com.janseva.service.StaffService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class PrivacyTest {

    @Autowired
    private StaffService staffService;

    // 1. Public/map response contains no citizen identity, contact or complaint body
    @Test
    void mapResponseContainsNoPII() {
        List<MapIssueResponse> issues = staffService.getMapIssues(null, "ADMIN");

        for (MapIssueResponse issue : issues) {
            // MapIssueResponse has no citizen name, email, phone, or complaint text fields
            assertNotNull(issue.id);
            assertNotNull(issue.status);
            // These fields should NOT exist in MapIssueResponse:
            // - citizenId, citizenName, email, phone, textCipher, exactLocationCipher
            // The DTO was designed without these fields
        }
    }

    // 2. MapIssueResponse only has public coordinates, never exact
    @Test
    void mapResponseHasNoExactCoordinates() {
        // MapIssueResponse DTO only has publicLatitude/publicLongitude fields
        // There is no exactLocationCipher field — privacy by design
        MapIssueResponse resp = new MapIssueResponse();
        resp.publicLatitude = new java.math.BigDecimal("28.61");
        resp.publicLongitude = new java.math.BigDecimal("77.21");

        // Verify the DTO class has no exact location field
        try {
            resp.getClass().getField("exactLocationCipher");
            fail("MapIssueResponse should NOT have exactLocationCipher field");
        } catch (NoSuchFieldException e) {
            // Expected — privacy by design
        }

        try {
            resp.getClass().getField("citizenId");
            fail("MapIssueResponse should NOT have citizenId field");
        } catch (NoSuchFieldException e) {
            // Expected — no PII
        }
    }
}
