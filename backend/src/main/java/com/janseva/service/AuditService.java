package com.janseva.service;

import com.janseva.entity.AuditEvent;
import com.janseva.repository.AuditEventRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuditService {
    private final AuditEventRepository repo;

    public AuditService(AuditEventRepository repo) {
        this.repo = repo;
    }

    public void log(UUID actorId, String action, String targetType, UUID targetId, String details, String ipAddress) {
        AuditEvent event = new AuditEvent();
        event.actorId = actorId;
        event.action = action;
        event.targetType = targetType;
        event.targetId = targetId;
        event.details = details;
        event.ipAddress = ipAddress;
        event.createdAt = OffsetDateTime.now();
        repo.save(event);
    }

    public List<AuditEvent> getAll() {
        return repo.findAllByOrderByCreatedAtDesc();
    }

    public List<AuditEvent> getByActor(UUID actorId) {
        return repo.findByActorIdOrderByCreatedAtDesc(actorId);
    }
}
