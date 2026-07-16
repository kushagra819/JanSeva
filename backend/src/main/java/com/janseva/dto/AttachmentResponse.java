package com.janseva.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Attachment metadata safe for authorized API consumers. Storage and encrypted-name fields stay server-side. */
public class AttachmentResponse {
    public UUID id;
    public String mimeType;
    public long sizeBytes;
    public OffsetDateTime createdAt;

    public AttachmentResponse(UUID id, String mimeType, long sizeBytes, OffsetDateTime createdAt) {
        this.id = id;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.createdAt = createdAt;
    }
}
