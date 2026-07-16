package com.janseva.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Privacy-safe response for map endpoint — no citizen identity, contact, or complaint body.
 */
public class MapIssueResponse {
    public UUID id;
    public String trackingCode;
    public BigDecimal publicLatitude;
    public BigDecimal publicLongitude;
    public String status;
    public String priority;
    public String departmentCode;
    public String taxonomyCode;
    public OffsetDateTime createdAt;

    public MapIssueResponse() {}

    public MapIssueResponse(UUID id, String trackingCode, BigDecimal publicLatitude, BigDecimal publicLongitude,
                            String status, String priority, String departmentCode, String taxonomyCode,
                            OffsetDateTime createdAt) {
        this.id = id;
        this.trackingCode = trackingCode;
        this.publicLatitude = publicLatitude;
        this.publicLongitude = publicLongitude;
        this.status = status;
        this.priority = priority;
        this.departmentCode = departmentCode;
        this.taxonomyCode = taxonomyCode;
        this.createdAt = createdAt;
    }
}
