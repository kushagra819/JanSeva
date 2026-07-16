package com.janseva.controller;

import com.janseva.dto.*;
import com.janseva.entity.Grievance;
import com.janseva.service.StaffService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StaffController {
    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping("/staff/grievances")
    public List<Grievance> listGrievances(
            Authentication auth,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String departmentCode,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer limit) {

        String callerDept = getDeptFromAuth(auth);
        String callerRole = getRoleFromAuth(auth);

        return staffService.getStaffGrievances(callerDept, callerRole, status, priority, departmentCode, limit);
    }

    @PostMapping("/grievances/{id}/review")
    public Grievance reviewGrievance(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody ReviewRequest req) {

        UUID actorId = UUID.fromString(auth.getName());
        String actorDept = getDeptFromAuth(auth);
        String actorRole = getRoleFromAuth(auth);

        return staffService.reviewGrievance(id, req, actorId, actorDept, actorRole);
    }

    @PatchMapping("/staff/grievances/{id}/assign")
    public Grievance assignOfficer(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody AssignRequest req) {

        UUID actorId = UUID.fromString(auth.getName());
        String actorDept = getDeptFromAuth(auth);
        String actorRole = getRoleFromAuth(auth);

        return staffService.assignOfficer(id, req.officerId, actorId, actorDept, actorRole);
    }

    @PatchMapping("/staff/grievances/{id}/status")
    public Grievance updateStatus(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody StatusUpdateRequest req) {

        UUID actorId = UUID.fromString(auth.getName());
        String actorDept = getDeptFromAuth(auth);
        String actorRole = getRoleFromAuth(auth);

        return staffService.updateStatus(id, req.status, req.message, actorId, actorDept, actorRole);
    }

    @GetMapping("/staff/map/issues")
    public List<MapIssueResponse> getMapIssues(Authentication auth) {
        String callerDept = getDeptFromAuth(auth);
        String callerRole = getRoleFromAuth(auth);
        return staffService.getMapIssues(callerDept, callerRole);
    }

    @GetMapping("/analytics/summary")
    public AnalyticsSummaryResponse getAnalytics(Authentication auth) {
        String callerDept = getDeptFromAuth(auth);
        String callerRole = getRoleFromAuth(auth);
        return staffService.getAnalytics(callerDept, callerRole);
    }

    private String getRoleFromAuth(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(a -> a.startsWith("ROLE_"))
            .map(a -> a.substring(5)) // Remove ROLE_ prefix
            .findFirst()
            .orElse("CITIZEN");
    }

    private String getDeptFromAuth(Authentication auth) {
        // The department is stored in the JWT claims
        // The JwtAuthenticationFilter needs to pass it through — we extract from auth details
        if (auth.getCredentials() instanceof String) {
            return (String) auth.getCredentials();
        }
        return null;
    }
}
