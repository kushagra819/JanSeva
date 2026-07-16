package com.janseva.controller;

import com.janseva.dto.AiAnalysisResponse;
import com.janseva.dto.CreateGrievanceRequest;
import com.janseva.entity.Attachment;
import com.janseva.entity.Grievance;
import com.janseva.entity.TimelineEvent;
import com.janseva.exception.ApiException;
import com.janseva.repository.GrievanceRepository;
import com.janseva.repository.TimelineEventRepository;
import com.janseva.service.FileService;
import com.janseva.service.GrievanceService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/grievances")
public class GrievanceController {
    private final GrievanceService service;
    private final GrievanceRepository grievanceRepo;
    private final TimelineEventRepository timelineRepo;
    private final FileService fileService;

    public GrievanceController(GrievanceService service, GrievanceRepository grievanceRepo,
                                TimelineEventRepository timelineRepo, FileService fileService) {
        this.service = service;
        this.grievanceRepo = grievanceRepo;
        this.timelineRepo = timelineRepo;
        this.fileService = fileService;
    }

    @PostMapping
    public Grievance create(Authentication auth, @Valid @RequestBody CreateGrievanceRequest req) {
        return service.create(UUID.fromString(auth.getName()), req);
    }

    @GetMapping("/mine")
    public List<Grievance> getMine(Authentication auth) {
        return service.getMine(UUID.fromString(auth.getName()));
    }

    @GetMapping("/{id}")
    public Grievance getById(Authentication auth, @PathVariable UUID id) {
        UUID callerId = UUID.fromString(auth.getName());
        Grievance g = service.getById(id, callerId);

        // If citizen, enforce ownership
        if (isCitizen(auth) && !callerId.equals(g.citizenId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
        }
        return g;
    }

    @PostMapping("/{id}/analyze")
    public AiAnalysisResponse analyze(Authentication auth, @PathVariable UUID id,
                                       @RequestBody Map<String, String> body) {
        UUID callerId = UUID.fromString(auth.getName());
        return service.analyze(id, body.get("text"), callerId);
    }

    @GetMapping("/{id}/timeline")
    public List<TimelineEvent> getTimeline(Authentication auth, @PathVariable UUID id) {
        UUID callerId = UUID.fromString(auth.getName());

        // Ownership check for citizens
        if (isCitizen(auth)) {
            Grievance g = grievanceRepo.findById(id)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));
            if (!callerId.equals(g.citizenId)) {
                throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
            }
        }

        return timelineRepo.findByGrievanceId(id);
    }

    @GetMapping("/{id}/analysis")
    public AiAnalysisResponse getAnalysis(Authentication auth, @PathVariable UUID id) {
        UUID callerId = UUID.fromString(auth.getName());
        Grievance g = grievanceRepo.findById(id)
            .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        if (isCitizen(auth) && !callerId.equals(g.citizenId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
        }

        // Return stored analysis data from grievance
        AiAnalysisResponse resp = new AiAnalysisResponse();
        resp.grievanceId = g.id.toString();
        resp.departmentCode = g.departmentCode;
        resp.taxonomyCode = g.taxonomyCode;
        resp.confidence = g.confidence != null ? g.confidence.doubleValue() : null;
        resp.priority = g.priority;
        return resp;
    }

    // ===== File Upload Endpoints =====

    @PostMapping("/{id}/attachments")
    public Attachment uploadAttachment(Authentication auth, @PathVariable UUID id,
                                        @RequestParam("file") MultipartFile file) {
        UUID callerId = UUID.fromString(auth.getName());

        // Verify grievance exists and caller is authorized
        Grievance g = grievanceRepo.findById(id)
            .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        if (isCitizen(auth) && !callerId.equals(g.citizenId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
        }

        return fileService.upload(id, callerId, file);
    }

    @GetMapping("/{id}/attachments")
    public List<Attachment> listAttachments(Authentication auth, @PathVariable UUID id) {
        UUID callerId = UUID.fromString(auth.getName());

        Grievance g = grievanceRepo.findById(id)
            .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        if (isCitizen(auth) && !callerId.equals(g.citizenId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
        }

        return fileService.listByGrievance(id);
    }

    @GetMapping("/{grievanceId}/attachments/{attachmentId}")
    public ResponseEntity<byte[]> downloadAttachment(
            Authentication auth,
            @PathVariable UUID grievanceId,
            @PathVariable UUID attachmentId) {

        UUID callerId = UUID.fromString(auth.getName());
        String callerRole = getRoleFromAuth(auth);
        String callerDept = getDeptFromAuth(auth);

        Attachment a = fileService.getAttachment(attachmentId);
        byte[] data = fileService.download(attachmentId, callerId, callerRole, callerDept);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(a.mimeType));
        headers.set("X-Content-Type-Options", "nosniff");
        headers.setContentLength(data.length);

        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    private boolean isCitizen(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(a -> a.equals("ROLE_CITIZEN"));
    }

    private String getRoleFromAuth(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(a -> a.startsWith("ROLE_"))
            .map(a -> a.substring(5))
            .findFirst()
            .orElse("CITIZEN");
    }

    private String getDeptFromAuth(Authentication auth) {
        if (auth.getCredentials() instanceof String) {
            return (String) auth.getCredentials();
        }
        return null;
    }
}
