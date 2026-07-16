package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="notifications")
public class Notification {
    @Id @GeneratedValue public UUID id;
    public UUID userId;
    public UUID grievanceId;
    public String title;
    public String message;
    public OffsetDateTime readAt;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
