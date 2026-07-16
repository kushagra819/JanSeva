package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="attachments")
public class Attachment {
    @Id @GeneratedValue public UUID id;
    public UUID grievanceId;
    public UUID uploadedBy;
    public String originalNameCipher;
    public String storedName;
    public String mimeType;
    public Long sizeBytes;
    @Column(columnDefinition = "char(64)")
    public String sha256;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
