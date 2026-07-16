package com.janseva.repository;

import com.janseva.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    List<AuditEvent> findAllByOrderByCreatedAtDesc();
    List<AuditEvent> findByActorIdOrderByCreatedAtDesc(UUID actorId);
    List<AuditEvent> findByTargetTypeOrderByCreatedAtDesc(String targetType);
}
