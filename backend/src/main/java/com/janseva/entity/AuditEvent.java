package com.janseva.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id
    @GeneratedValue
    public UUID id;

    public UUID actorId;
    public String action;
    public String targetType;
    public UUID targetId;

    @Column(columnDefinition = "TEXT")
    public String details;

    public String ipAddress;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
