package com.janseva.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** API-safe grievance representation; encrypted storage fields never leave the server. */
public class GrievanceResponse {
    public UUID id;
    public String trackingCode;
    public UUID citizenId;
    public UUID assignedOfficerId;
    public String description;
    public String language;
    public String district;
    public String locality;
    public Double latitude;
    public Double longitude;
    public String status;
    public String priority;
    public String departmentCode;
    public String taxonomyCode;
    public BigDecimal confidence;
    public String channel;
    public OffsetDateTime slaDueAt;
    public String detectedLanguage;
    public String sentiment;
    public OffsetDateTime createdAt;
    public OffsetDateTime updatedAt;
}
