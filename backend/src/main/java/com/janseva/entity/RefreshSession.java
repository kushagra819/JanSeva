package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="refresh_sessions")
public class RefreshSession {
    @Id @GeneratedValue public UUID id;
    public UUID userId;
    @Column(columnDefinition = "char(64)")
    public String tokenHash;
    public OffsetDateTime expiresAt;
    public OffsetDateTime revokedAt;
    public UUID replacedBy;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
