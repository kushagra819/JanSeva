package com.janseva.service;

import com.janseva.dto.AiAnalysisResponse;
import com.janseva.dto.CreateGrievanceRequest;
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
import java.util.Optional;
import java.util.UUID;

@Service
public class GrievanceService {
    private final GrievanceRepository repo;
    private final TimelineEventRepository timelineRepo;
    private final AiClientService aiClient;
    private final EncryptionService encryption;

    private final SecureRandom random = new SecureRandom();
    private static final String TRACKING_PREFIX = "JSV-";

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
            t.publicMessage = "AI analysis complete. Department: " + g.departmentCode;
            t.createdAt = OffsetDateTime.now();
            timelineRepo.save(t);
        }
        return res;
    }

    public List<Grievance> getMine(UUID citizenId) {
        return repo.findByCitizenId(citizenId);
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
