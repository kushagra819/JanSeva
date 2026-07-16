package com.janseva.controller;

import com.janseva.dto.CreateStaffRequest;
import com.janseva.dto.UserResponse;
import com.janseva.entity.AuditEvent;
import com.janseva.entity.User;
import com.janseva.exception.ApiException;
import com.janseva.repository.UserRepository;
import com.janseva.service.AuditService;
import com.janseva.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AuthService authService;
    private final UserRepository userRepo;
    private final AuditService auditService;

    private static final Set<String> VALID_STAFF_ROLES = Set.of("OFFICER", "DEPARTMENT_HEAD", "ADMIN", "COMMISSIONER");
    private static final Set<String> DEPT_REQUIRED_ROLES = Set.of("OFFICER", "DEPARTMENT_HEAD");

    public AdminController(AuthService authService, UserRepository userRepo, AuditService auditService) {
        this.authService = authService;
        this.userRepo = userRepo;
        this.auditService = auditService;
    }

    @PostMapping("/users")
    public UserResponse createStaff(Authentication auth, @Valid @RequestBody CreateStaffRequest req,
                                     HttpServletRequest httpReq) {
        // Validate role
        if (!VALID_STAFF_ROLES.contains(req.role)) {
            throw new ApiException("INVALID_ROLE", HttpStatus.BAD_REQUEST,
                "Role must be one of: " + VALID_STAFF_ROLES);
        }

        // Validate department required for OFFICER and DEPARTMENT_HEAD
        if (DEPT_REQUIRED_ROLES.contains(req.role) &&
            (req.departmentCode == null || req.departmentCode.isBlank())) {
            throw new ApiException("VALIDATION_ERROR", HttpStatus.BAD_REQUEST,
                "Department code is required for " + req.role + " role.");
        }

        User user = authService.createStaffUser(req.name, req.email, req.password, req.role, req.departmentCode);

        // Audit
        UUID actorId = UUID.fromString(auth.getName());
        auditService.log(actorId, "CREATE_STAFF", "USER", user.id,
            "Created " + req.role + " user: " + req.email, httpReq.getRemoteAddr());

        return new UserResponse(
            user.id.toString(), user.name, user.email,
            user.role, user.departmentCode, user.active,
            user.createdAt != null ? user.createdAt.toString() : null
        );
    }

    @GetMapping("/users")
    public List<UserResponse> listUsers(Authentication auth) {
        return userRepo.findAll().stream()
            .map(u -> new UserResponse(
                u.id.toString(), u.name, u.email,
                u.role, u.departmentCode, u.active,
                u.createdAt != null ? u.createdAt.toString() : null
            ))
            .collect(Collectors.toList());
    }

    @GetMapping("/audit")
    public List<AuditEvent> getAuditLog(Authentication auth) {
        return auditService.getAll();
    }
}
