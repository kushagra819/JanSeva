package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="timeline_events")
public class TimelineEvent {
    @Id @GeneratedValue public UUID id;
    public UUID grievanceId;
    public UUID actorId;
    public String eventType;
    public String oldStatus;
    public String newStatus;
    public String publicMessage;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
