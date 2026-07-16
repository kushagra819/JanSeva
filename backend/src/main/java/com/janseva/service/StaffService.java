package com.janseva.service;

import com.janseva.dto.*;
import com.janseva.entity.Grievance;
import com.janseva.entity.Notification;
import com.janseva.entity.TimelineEvent;
import com.janseva.entity.User;
import com.janseva.exception.ApiException;
import com.janseva.repository.GrievanceRepository;
import com.janseva.repository.TimelineEventRepository;
import com.janseva.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StaffService {
    private final GrievanceRepository grievanceRepo;
    private final TimelineEventRepository timelineRepo;
    private final UserRepository userRepo;
    private final StatusStateMachine stateMachine;
    private final NotificationService notificationService;

    public StaffService(GrievanceRepository grievanceRepo, TimelineEventRepository timelineRepo,
                        UserRepository userRepo, StatusStateMachine stateMachine,
                        NotificationService notificationService) {
        this.grievanceRepo = grievanceRepo;
        this.timelineRepo = timelineRepo;
        this.userRepo = userRepo;
        this.stateMachine = stateMachine;
        this.notificationService = notificationService;
    }

    public List<Grievance> getStaffGrievances(String callerDept, String callerRole,
                                               String statusFilter, String priorityFilter,
                                               String deptFilter, Integer limit) {
        List<Grievance> results;

        // Officers and Dept Heads can only see their department
        if ("OFFICER".equals(callerRole) || "DEPARTMENT_HEAD".equals(callerRole)) {
            // Ignore a caller-supplied department filter that exceeds authorization
            results = grievanceRepo.findByDeptWithFilters(callerDept, statusFilter, priorityFilter);
        } else {
            // ADMIN and COMMISSIONER can see all or filter by dept
            results = grievanceRepo.findWithFilters(statusFilter, priorityFilter, deptFilter);
        }

        if (limit != null && limit > 0 && results.size() > limit) {
            results = results.subList(0, limit);
        }

        return results;
    }

    public Grievance assignOfficer(UUID grievanceId, UUID officerId, UUID actorId, String actorDept, String actorRole) {
        Grievance g = grievanceRepo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        // Department check for non-admin
        if (!"ADMIN".equals(actorRole) && !"COMMISSIONER".equals(actorRole)) {
            if (!actorDept.equals(g.departmentCode)) {
                throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN,
                    "You can only assign grievances in your department.");
            }
        }

        // Verify officer exists and is in the correct department
        User officer = userRepo.findById(officerId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Officer not found."));

        if (!"OFFICER".equals(officer.role) && !"DEPARTMENT_HEAD".equals(officer.role)) {
            throw new ApiException("INVALID_ASSIGNMENT", HttpStatus.BAD_REQUEST,
                "Can only assign to officers or department heads.");
        }

        g.assignedOfficerId = officerId;
        grievanceRepo.save(g);

        // Timeline
        TimelineEvent t = new TimelineEvent();
        t.grievanceId = g.id;
        t.actorId = actorId;
        t.eventType = "ASSIGNED";
        t.publicMessage = "Complaint assigned to an officer.";
        t.createdAt = OffsetDateTime.now();
        timelineRepo.save(t);

        // Notify citizen
        if (g.citizenId != null) {
            notificationService.createNotification(g.citizenId, g.id,
                "Officer Assigned",
                "An officer has been assigned to your complaint " + g.trackingCode + ".");
        }

        // Notify the assigned officer
        notificationService.createNotification(officerId, g.id,
            "New Assignment",
            "You have been assigned complaint " + g.trackingCode + ".");

        return g;
    }

    public Grievance updateStatus(UUID grievanceId, String newStatus, String message,
                                   UUID actorId, String actorDept, String actorRole) {
        Grievance g = grievanceRepo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        // Department check for non-admin
        if (!"ADMIN".equals(actorRole) && !"COMMISSIONER".equals(actorRole)) {
            if (!actorDept.equals(g.departmentCode)) {
                throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN,
                    "You can only update grievances in your department.");
            }
        }

        String oldStatus = g.status;
        stateMachine.validateTransition(oldStatus, newStatus);

        g.status = newStatus;
        grievanceRepo.save(g);

        // Timeline
        TimelineEvent t = new TimelineEvent();
        t.grievanceId = g.id;
        t.actorId = actorId;
        t.eventType = "STATUS_CHANGED";
        t.oldStatus = oldStatus;
        t.newStatus = newStatus;
        t.publicMessage = message != null ? message : "Status updated to " + newStatus + ".";
        t.createdAt = OffsetDateTime.now();
        timelineRepo.save(t);

        // Notify citizen
        if (g.citizenId != null) {
            notificationService.createNotification(g.citizenId, g.id,
                "Status Update: " + newStatus,
                "Your complaint " + g.trackingCode + " status changed to " + newStatus + ".");
        }

        return g;
    }

    public Grievance reviewGrievance(UUID grievanceId, ReviewRequest req,
                                      UUID actorId, String actorDept, String actorRole) {
        Grievance g = grievanceRepo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        // Must be in PENDING_REVIEW status
        if (!"PENDING_REVIEW".equals(g.status)) {
            throw new ApiException("INVALID_STATE", HttpStatus.UNPROCESSABLE_ENTITY,
                "Grievance must be in PENDING_REVIEW status to review.");
        }

        String oldDept = g.departmentCode;

        if ("APPROVE".equalsIgnoreCase(req.decision)) {
            g.status = "ROUTED";
        } else if ("OVERRIDE".equalsIgnoreCase(req.decision)) {
            if (req.overrideDepartmentCode != null && !req.overrideDepartmentCode.isBlank()) {
                g.departmentCode = req.overrideDepartmentCode;
            }
            g.status = "ROUTED";
        } else {
            throw new ApiException("INVALID_DECISION", HttpStatus.BAD_REQUEST,
                "Decision must be APPROVE or OVERRIDE.");
        }

        grievanceRepo.save(g);

        // Timeline
        TimelineEvent t = new TimelineEvent();
        t.grievanceId = g.id;
        t.actorId = actorId;
        t.eventType = "REVIEWED";
        t.oldStatus = "PENDING_REVIEW";
        t.newStatus = "ROUTED";
        t.publicMessage = req.message != null ? req.message : "Review complete. Decision: " + req.decision;
        t.createdAt = OffsetDateTime.now();
        timelineRepo.save(t);

        // Route correction timeline if department changed
        if ("OVERRIDE".equalsIgnoreCase(req.decision) && !Objects.equals(oldDept, g.departmentCode)) {
            TimelineEvent rc = new TimelineEvent();
            rc.grievanceId = g.id;
            rc.actorId = actorId;
            rc.eventType = "ROUTE_CORRECTED";
            rc.publicMessage = "Department changed from " + oldDept + " to " + g.departmentCode + ".";
            rc.createdAt = OffsetDateTime.now();
            timelineRepo.save(rc);
        }

        // Notify citizen
        if (g.citizenId != null) {
            notificationService.createNotification(g.citizenId, g.id,
                "Complaint Reviewed",
                "Your complaint " + g.trackingCode + " has been reviewed and routed.");
        }

        return g;
    }

    public List<MapIssueResponse> getMapIssues(String callerDept, String callerRole) {
        List<Grievance> grievances;

        if ("OFFICER".equals(callerRole) || "DEPARTMENT_HEAD".equals(callerRole)) {
            grievances = grievanceRepo.findByDepartmentCode(callerDept);
        } else {
            grievances = grievanceRepo.findAll();
        }

        // Return privacy-safe data only
        return grievances.stream()
            .filter(g -> g.publicLatitude != null && g.publicLongitude != null)
            .map(g -> new MapIssueResponse(
                g.id, g.trackingCode,
                g.publicLatitude, g.publicLongitude,
                g.status, g.priority, g.departmentCode, g.taxonomyCode,
                g.createdAt
            ))
            .collect(Collectors.toList());
    }

    public AnalyticsSummaryResponse getAnalytics(String callerDept, String callerRole) {
        AnalyticsSummaryResponse resp = new AnalyticsSummaryResponse();

        List<Grievance> all;
        if ("OFFICER".equals(callerRole) || "DEPARTMENT_HEAD".equals(callerRole)) {
            all = grievanceRepo.findByDepartmentCode(callerDept);
        } else {
            all = grievanceRepo.findAll();
        }

        resp.totalComplaints = all.size();

        resp.byStatus = all.stream()
            .filter(g -> g.status != null)
            .collect(Collectors.groupingBy(g -> g.status, Collectors.counting()));

        resp.byDepartment = all.stream()
            .filter(g -> g.departmentCode != null)
            .collect(Collectors.groupingBy(g -> g.departmentCode, Collectors.counting()));

        resp.byPriority = all.stream()
            .filter(g -> g.priority != null)
            .collect(Collectors.groupingBy(g -> g.priority, Collectors.counting()));

        resp.resolvedCount = all.stream().filter(g -> "RESOLVED".equals(g.status)).count();
        resp.pendingCount = all.stream().filter(g ->
            "RECEIVED".equals(g.status) || "PROCESSING".equals(g.status) ||
            "PENDING_REVIEW".equals(g.status) || "ROUTED".equals(g.status) ||
            "IN_PROGRESS".equals(g.status)).count();
        resp.emergencyCount = all.stream().filter(g -> "EMERGENCY".equals(g.priority)).count();

        return resp;
    }
}
