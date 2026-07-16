package com.janseva.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "grievances")
public class Grievance {
    @Id
    @GeneratedValue
    public UUID id;

    public String trackingCode;
    public UUID citizenId;
    public UUID assignedOfficerId;
    public String exactLocationCipher;

    @Column(precision = 9, scale = 6)
    public BigDecimal publicLatitude;

    @Column(precision = 9, scale = 6)
    public BigDecimal publicLongitude;

    public OffsetDateTime slaDueAt;
    public String status;
    public String priority;
    public String departmentCode;
    public String taxonomyCode;

    @Column(precision = 5, scale = 4)
    public BigDecimal confidence;

    public String idempotencyKey;
    public String textCipher;
    public String channel;

    public OffsetDateTime createdAt = OffsetDateTime.now();
}
