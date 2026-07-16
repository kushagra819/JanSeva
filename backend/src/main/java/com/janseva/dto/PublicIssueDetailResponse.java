package com.janseva.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Public issue detail with an intentionally small, identity-free data surface. */
public class PublicIssueDetailResponse {
    public UUID id;
    public String trackingCode;
    public BigDecimal publicLatitude;
    public BigDecimal publicLongitude;
    public String status;
    public String priority;
    public String departmentCode;
    public String taxonomyCode;
    public String description;
    public boolean hasPublicImage;
    public String publicImageUrl;
    public OffsetDateTime createdAt;
    public List<PublicTimelineItem> timeline = new ArrayList<>();

    public static class PublicTimelineItem {
        public String eventType;
        public String status;
        public String message;
        public OffsetDateTime createdAt;

        public PublicTimelineItem(String eventType, String status, String message, OffsetDateTime createdAt) {
            this.eventType = eventType;
            this.status = status;
            this.message = message;
            this.createdAt = createdAt;
        }
    }
}
