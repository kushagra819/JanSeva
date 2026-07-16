package com.janseva.service;

import com.janseva.dto.AiAnalysisResponse;
import com.janseva.dto.CreateGrievanceRequest;
import com.janseva.dto.GrievanceResponse;
import com.janseva.entity.Grievance;
import com.janseva.entity.TimelineEvent;
import com.janseva.entity.Notification;
import com.janseva.exception.ApiException;
import com.janseva.repository.GrievanceRepository;
import com.janseva.repository.TimelineEventRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class GrievanceService {
    private final GrievanceRepository repo;
    private final TimelineEventRepository timelineRepo;
    private final AiClientService aiClient;
    private final EncryptionService encryption;

    private final SecureRandom random = new SecureRandom();
    private static final String TRACKING_PREFIX = "JSV-";
    private static final Set<String> PUBLIC_DEPARTMENTS = Set.of(
            "ROADS", "WATER", "ELECTRICITY", "SANITATION", "PUBLIC_SAFETY",
            "PARKS_HORTICULTURE", "HEALTH", "BUILDING_URBAN_PLANNING", "TRANSPORT", "PUBLIC_SERVICES");

    public GrievanceService(GrievanceRepository repo, TimelineEventRepository timelineRepo,
                            AiClientService aiClient, EncryptionService encryption) {
        this.repo = repo;
        this.timelineRepo = timelineRepo;
        this.aiClient = aiClient;
        this.encryption = encryption;
    }

    public Grievance create(UUID citizenId, CreateGrievanceRequest req) {
        // Idempotency check
        if (req.idempotencyKey != null && !req.idempotencyKey.isBlank()) {
            Optional<Grievance> existing = repo.findByIdempotencyKey(req.idempotencyKey);
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Grievance g = new Grievance();
        g.citizenId = citizenId;
        g.trackingCode = generateUniqueTrackingCode();
        g.status = "RECEIVED";
        g.priority = "NORMAL";
        g.channel = (req.channel != null && !req.channel.isBlank()) ? req.channel : "WEB";
        g.idempotencyKey = req.idempotencyKey;
        g.createdAt = OffsetDateTime.now();

        // Encrypt complaint text
        try {
            g.textCipher = encryption.encrypt(req.text);
        } catch (Exception e) {
            // If encryption fails, still store — but log
            System.err.println("Failed to encrypt complaint text: " + e.getMessage());
        }

        // Handle location
        if (req.latitude != null && req.longitude != null) {
            g.publicLatitude = BigDecimal.valueOf(req.latitude).setScale(2, RoundingMode.HALF_UP);
            g.publicLongitude = BigDecimal.valueOf(req.longitude).setScale(2, RoundingMode.HALF_UP);
            try {
                g.exactLocationCipher = encryption.encrypt(req.latitude + "," + req.longitude);
            } catch (Exception e) {
                System.err.println("Failed to encrypt location: " + e.getMessage());
            }
        }

        g = repo.save(g);

        // Create timeline event
        TimelineEvent t = new TimelineEvent();
        t.grievanceId = g.id;
        t.actorId = citizenId;
        t.eventType = "CREATED";
        t.newStatus = "RECEIVED";
        t.publicMessage = "Complaint submitted successfully.";
        t.createdAt = OffsetDateTime.now();
        timelineRepo.save(t);

        return g;
    }

    public Grievance getById(UUID grievanceId, UUID callerId) {
        Grievance g = repo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));
        // Ownership check for citizens is done at the controller level
        return g;
    }

    public AiAnalysisResponse analyze(UUID grievanceId, String text, UUID callerId) {
        Grievance g = repo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        // Verify caller owns this grievance
        if (g.citizenId != null && !g.citizenId.equals(callerId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You do not own this complaint.");
        }

        AiAnalysisResponse res = aiClient.analyzeGrievance(grievanceId.toString(), text);
        if (res != null) {
            g.departmentCode = res.departmentCode;
            g.taxonomyCode = res.taxonomyCode;
            g.confidence = res.confidence != null ? BigDecimal.valueOf(res.confidence) : null;
            g.priority = res.priority;
            g.slaDueAt = "EMERGENCY".equals(g.priority)
                    ? OffsetDateTime.now().plusMinutes(15)
                    : "HIGH".equals(g.priority)
                        ? OffsetDateTime.now().plusHours(2)
                        : OffsetDateTime.now().plusHours(24);

            String oldStatus = g.status;
            if ("AUTO_ROUTE".equals(res.decision)) {
                g.status = "ROUTED";
            } else {
                g.status = "PENDING_REVIEW";
            }
            repo.save(g);

            // Timeline event
            TimelineEvent t = new TimelineEvent();
            t.grievanceId = g.id;
            t.actorId = callerId;
            t.eventType = "ANALYZED";
            t.oldStatus = oldStatus;
            t.newStatus = g.status;
            t.publicMessage = "AI analysis complete. Department: " + g.departmentCode + ", priority: " + g.priority + ".";
            t.createdAt = OffsetDateTime.now();
            timelineRepo.save(t);
        }
        return res;
    }

    public List<Grievance> getMine(UUID citizenId) {
        return repo.findByCitizenId(citizenId);
    }

    public Grievance applyCitizenRoutingOverride(UUID grievanceId, String departmentCode) {
        if (!PUBLIC_DEPARTMENTS.contains(departmentCode)) {
            throw new ApiException("INVALID_DEPARTMENT", HttpStatus.BAD_REQUEST, "The selected department is not supported.");
        }
        Grievance grievance = repo.findById(grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));
        String oldStatus = grievance.status;
        grievance.departmentCode = departmentCode;
        grievance.taxonomyCode = departmentCode + ".CITIZEN_SELECTED";
        grievance.status = "PENDING_REVIEW";
        grievance = repo.save(grievance);

        TimelineEvent event = new TimelineEvent();
        event.grievanceId = grievance.id;
        event.eventType = "CITIZEN_ROUTE_CORRECTION";
        event.oldStatus = oldStatus;
        event.newStatus = "PENDING_REVIEW";
        event.publicMessage = "Citizen suggested a department after a low-confidence recommendation; staff review is required.";
        event.createdAt = OffsetDateTime.now();
        timelineRepo.save(event);
        return grievance;
    }

    public GrievanceResponse toResponse(Grievance grievance) {
        GrievanceResponse response = new GrievanceResponse();
        response.id = grievance.id;
        response.trackingCode = grievance.trackingCode;
        response.citizenId = grievance.citizenId;
        response.assignedOfficerId = grievance.assignedOfficerId;
        response.status = grievance.status;
        response.priority = grievance.priority;
        response.departmentCode = grievance.departmentCode;
        response.taxonomyCode = grievance.taxonomyCode;
        response.confidence = grievance.confidence;
        response.channel = grievance.channel;
        response.slaDueAt = grievance.slaDueAt;
        response.createdAt = grievance.createdAt;
        response.updatedAt = grievance.createdAt;
        response.language = "Auto Detect";
        response.district = "";
        response.locality = "Pinned location";

        try {
            response.description = encryption.decrypt(grievance.textCipher);
            response.detectedLanguage = detectLanguage(response.description);
            response.sentiment = detectSentiment(response.description, grievance.priority);
        } catch (Exception ignored) {
            response.description = "Complaint details are unavailable.";
            response.detectedLanguage = "Unknown";
            response.sentiment = "NEUTRAL";
        }

        if (grievance.exactLocationCipher != null) {
            try {
                String[] coordinates = encryption.decrypt(grievance.exactLocationCipher).split(",", 2);
                response.latitude = Double.valueOf(coordinates[0]);
                response.longitude = Double.valueOf(coordinates[1]);
            } catch (Exception ignored) {
                // Public rounded coordinates remain available to the map endpoint.
            }
        }
        return response;
    }

    public String getDetectedLanguage(Grievance grievance) {
        try {
            return detectLanguage(encryption.decrypt(grievance.textCipher));
        } catch (Exception ignored) {
            return "Unknown";
        }
    }

    public String getSentiment(Grievance grievance) {
        try {
            return detectSentiment(encryption.decrypt(grievance.textCipher), grievance.priority);
        } catch (Exception ignored) {
            return "NEUTRAL";
        }
    }

    private String detectLanguage(String text) {
        for (char character : text.toCharArray()) {
            Character.UnicodeBlock block = Character.UnicodeBlock.of(character);
            if (block == Character.UnicodeBlock.DEVANAGARI) return "Hindi / Marathi";
            if (block == Character.UnicodeBlock.GUJARATI) return "Gujarati";
            if (block == Character.UnicodeBlock.TAMIL) return "Tamil";
            if (block == Character.UnicodeBlock.TELUGU) return "Telugu";
            if (block == Character.UnicodeBlock.KANNADA) return "Kannada";
            if (block == Character.UnicodeBlock.BENGALI) return "Bengali";
        }
        return "English";
    }

    private String detectSentiment(String text, String priority) {
        String normalized = text.toLowerCase(Locale.ROOT);
        List<String> frustrationSignals = List.of(
                "frustrated", "angry", "fed up", "no one is listening", "many complaints",
                "still not fixed", "unacceptable", "बहुत परेशान", "कोई सुन नहीं रहा", "मदद करो",
                "खूप त्रास", "कोणीही ऐकत नाही", "तातडीने मदत");
        if ("EMERGENCY".equals(priority)) return "DISTRESSED";
        if ("HIGH".equals(priority)) return "CONCERNED";
        if (frustrationSignals.stream().anyMatch(normalized::contains)) return "FRUSTRATED";
        if (List.of("please check", "when possible", "request you", "kindly", "minor issue").stream().anyMatch(normalized::contains)) return "CALM";
        return "CALM";
    }

    private String generateUniqueTrackingCode() {
        // Retry loop for uniqueness
        for (int attempt = 0; attempt < 10; attempt++) {
            long timestamp = System.currentTimeMillis() % 1000000;
            int randomPart = random.nextInt(9999);
            String code = TRACKING_PREFIX + String.format("%06d", timestamp) + String.format("%04d", randomPart);
            if (repo.findByTrackingCode(code).isEmpty()) {
                return code;
            }
        }
        // Fallback: UUID-based
        return TRACKING_PREFIX + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
    }
}
