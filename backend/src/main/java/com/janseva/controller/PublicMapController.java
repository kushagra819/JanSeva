package com.janseva.controller;

import com.janseva.dto.AiAnalysisResponse;
import com.janseva.dto.CreateGrievanceRequest;
import com.janseva.dto.GrievanceResponse;
import com.janseva.dto.MapIssueResponse;
import com.janseva.dto.PublicIssueDetailResponse;
import com.janseva.entity.Attachment;
import com.janseva.entity.Grievance;
import com.janseva.repository.TimelineEventRepository;
import com.janseva.service.AiClientService;
import com.janseva.service.FileService;
import com.janseva.service.GrievanceService;
import com.janseva.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/** Privacy-safe public map data. Exact locations, complaint text and citizen data are never returned. */
@RestController
@RequestMapping("/api/v1/public")
public class PublicMapController {
    private final StaffService staffService;
    private final GrievanceService grievanceService;
    private final AiClientService aiClientService;
    private final FileService fileService;
    private final TimelineEventRepository timelineRepository;

    private static final Pattern EMAIL = Pattern.compile("(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b");
    private static final Pattern PHONE = Pattern.compile("(?<!\\d)(?:\\+?91[ -]?)?[6-9]\\d{9}(?!\\d)");
    private static final Pattern COORDINATES = Pattern.compile("(?<!\\d)-?\\d{1,2}\\.\\d{4,}[, ]+\\s*-?\\d{1,3}\\.\\d{4,}(?!\\d)");

    public PublicMapController(StaffService staffService, GrievanceService grievanceService,
                               AiClientService aiClientService, FileService fileService,
                               TimelineEventRepository timelineRepository) {
        this.staffService = staffService;
        this.grievanceService = grievanceService;
        this.aiClientService = aiClientService;
        this.fileService = fileService;
        this.timelineRepository = timelineRepository;
    }

    @GetMapping("/map/issues")
    public List<MapIssueResponse> getPublicMapIssues() {
        return staffService.getMapIssues(null, "PUBLIC");
    }

    @GetMapping("/map/issues/{id}")
    public PublicIssueDetailResponse getPublicIssue(@org.springframework.web.bind.annotation.PathVariable UUID id) {
        Grievance grievance = grievanceService.getById(id, null);
        GrievanceResponse privateView = grievanceService.toResponse(grievance);
        PublicIssueDetailResponse response = new PublicIssueDetailResponse();
        response.id = grievance.id;
        response.trackingCode = grievance.trackingCode;
        response.publicLatitude = grievance.publicLatitude;
        response.publicLongitude = grievance.publicLongitude;
        response.status = grievance.status;
        response.priority = grievance.priority;
        response.departmentCode = grievance.departmentCode;
        response.taxonomyCode = grievance.taxonomyCode;
        response.createdAt = grievance.createdAt;
        response.description = grievance.citizenId == null
                ? sanitizePublicDescription(privateView.description)
                : "A registered citizen submitted this issue. The complaint text and evidence are visible only to the citizen and authorized department staff.";
        response.hasPublicImage = fileService.hasPublicImage(id);
        response.publicImageUrl = response.hasPublicImage ? "/api/v1/public/map/issues/" + id + "/image" : null;
        response.timeline = timelineRepository.findByGrievanceId(id).stream()
                .sorted(Comparator.comparing(event -> event.createdAt))
                .filter(event -> event.publicMessage != null && !event.publicMessage.isBlank())
                .map(event -> new PublicIssueDetailResponse.PublicTimelineItem(
                        event.eventType,
                        event.newStatus,
                        grievance.citizenId == null
                                ? sanitizePublicDescription(event.publicMessage)
                                : "Issue status updated" + (event.newStatus == null ? "." : " to " + event.newStatus.replace('_', ' ') + "."),
                        event.createdAt))
                .toList();
        return response;
    }

    @GetMapping("/map/issues/{id}/image")
    public ResponseEntity<byte[]> getPublicIssueImage(@org.springframework.web.bind.annotation.PathVariable UUID id) {
        Attachment attachment = fileService.getPublicImage(id);
        byte[] data = fileService.downloadPublicImage(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(attachment.mimeType));
        headers.setContentLength(data.length);
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Content-Disposition", "inline");
        headers.setCacheControl(CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic());
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    private String sanitizePublicDescription(String value) {
        if (value == null || value.isBlank()) return "Issue details were not provided.";
        String sanitized = EMAIL.matcher(value).replaceAll("[email hidden]");
        sanitized = PHONE.matcher(sanitized).replaceAll("[phone hidden]");
        sanitized = COORDINATES.matcher(sanitized).replaceAll("[exact location hidden]");
        return sanitized.length() > 600 ? sanitized.substring(0, 600) + "..." : sanitized;
    }

    /** Analyze a draft without storing it, so citizens can verify routing before submission. */
    @PostMapping("/analyze")
    public AiAnalysisResponse analyzeDraft(@RequestBody Map<String, String> body) {
        String text = body.getOrDefault("text", "");
        return aiClientService.analyzeGrievance("draft-" + UUID.randomUUID(), text);
    }

    /**
     * Anonymous, location-first civic reporting. The optional evidence file is validated and encrypted
     * by the same service used for authenticated reports. No identity or contact details are collected.
     */
    @PostMapping(value = "/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> createPublicReport(
            @RequestPart("report") @Valid CreateGrievanceRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        request.channel = "WEB";
        Grievance grievance = grievanceService.create(null, request);
        AiAnalysisResponse analysis = grievanceService.analyze(grievance.id, request.text, null);
        if (request.departmentOverride != null && !request.departmentOverride.isBlank()
                && (analysis.confidence == null || analysis.confidence < 0.70)) {
            grievanceService.applyCitizenRoutingOverride(grievance.id, request.departmentOverride);
            analysis.departmentCode = request.departmentOverride;
            analysis.taxonomyCode = request.departmentOverride + ".CITIZEN_SELECTED";
            analysis.decision = "HUMAN_REVIEW";
            analysis.requiresHumanReview = true;
        }
        Attachment attachment = file != null && !file.isEmpty() ? fileService.upload(grievance.id, null, file) : null;
        GrievanceResponse response = grievanceService.toResponse(grievanceService.getById(grievance.id, null));
        return Map.of("grievance", response, "analysis", analysis, "attachmentUploaded", attachment != null);
    }
}
