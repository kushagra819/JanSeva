package com.janseva.service;

import com.janseva.entity.Attachment;
import com.janseva.entity.Grievance;
import com.janseva.exception.ApiException;
import com.janseva.repository.AttachmentRepository;
import com.janseva.repository.GrievanceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class FileService {
    private final AttachmentRepository attachmentRepo;
    private final GrievanceRepository grievanceRepo;
    private final EncryptionService encryptionService;

    @Value("${janseva.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${janseva.upload.max-mb:10}")
    private int maxUploadMb;

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    );

    // Magic byte signatures
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] WEBP_MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46}; // RIFF

    public FileService(AttachmentRepository attachmentRepo, GrievanceRepository grievanceRepo,
                       EncryptionService encryptionService) {
        this.attachmentRepo = attachmentRepo;
        this.grievanceRepo = grievanceRepo;
        this.encryptionService = encryptionService;
    }

    public Attachment upload(UUID grievanceId, UUID uploaderId, MultipartFile file) {
        // Validate file size
        long maxBytes = (long) maxUploadMb * 1024 * 1024;
        if (file.getSize() > maxBytes) {
            throw new ApiException("FILE_TOO_LARGE", HttpStatus.PAYLOAD_TOO_LARGE,
                "File size exceeds the maximum allowed size of " + maxUploadMb + " MB.");
        }

        // Validate MIME type
        String mimeType = file.getContentType();
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new ApiException("INVALID_FILE_TYPE", HttpStatus.BAD_REQUEST,
                "Allowed file types: JPEG, PNG, WebP, PDF.");
        }

        try {
            byte[] fileBytes = file.getBytes();

            // Validate magic bytes
            validateMagicBytes(fileBytes, mimeType);

            // Calculate SHA-256
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = md.digest(fileBytes);
            String sha256 = bytesToHex(hashBytes);

            // Generate server-side filename
            String storedName = UUID.randomUUID().toString() + getExtension(mimeType);

            // Encrypt file bytes
            String encryptedContent = encryptionService.encrypt(
                java.util.Base64.getEncoder().encodeToString(fileBytes)
            );

            // Write to disk
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path filePath = uploadPath.resolve(storedName);
            Files.writeString(filePath, encryptedContent);

            // Encrypt original filename
            String encryptedOriginalName = encryptionService.encrypt(file.getOriginalFilename());

            // Save record
            Attachment a = new Attachment();
            a.grievanceId = grievanceId;
            a.uploadedBy = uploaderId;
            a.originalNameCipher = encryptedOriginalName;
            a.storedName = storedName;
            a.mimeType = mimeType;
            a.sizeBytes = file.getSize();
            a.sha256 = sha256;
            a.createdAt = OffsetDateTime.now();

            return attachmentRepo.save(a);

        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException("UPLOAD_FAILED", HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to process file upload.");
        }
    }

    public byte[] download(UUID attachmentId, UUID callerId, String callerRole, String callerDept) {
        Attachment a = attachmentRepo.findById(attachmentId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Attachment not found."));

        Grievance g = grievanceRepo.findById(a.grievanceId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Grievance not found."));

        // Authorization check
        boolean isOwner = callerId.equals(g.citizenId);
        boolean isStaff = "OFFICER".equals(callerRole) || "DEPARTMENT_HEAD".equals(callerRole)
                        || "ADMIN".equals(callerRole) || "COMMISSIONER".equals(callerRole);
        boolean isDeptMatch = callerDept != null && callerDept.equals(g.departmentCode);

        if (!isOwner && !(isStaff && (isDeptMatch || "ADMIN".equals(callerRole) || "COMMISSIONER".equals(callerRole)))) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "You are not authorized to download this file.");
        }

        try {
            Path filePath = Paths.get(uploadDir).resolve(a.storedName);
            String encryptedContent = Files.readString(filePath);
            String decrypted = encryptionService.decrypt(encryptedContent);
            return java.util.Base64.getDecoder().decode(decrypted);
        } catch (Exception e) {
            throw new ApiException("DOWNLOAD_FAILED", HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to retrieve file.");
        }
    }

    public List<Attachment> listByGrievance(UUID grievanceId) {
        return attachmentRepo.findByGrievanceId(grievanceId);
    }

    public Attachment getAttachment(UUID attachmentId) {
        return attachmentRepo.findById(attachmentId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Attachment not found."));
    }

    private void validateMagicBytes(byte[] fileBytes, String mimeType) {
        if (fileBytes.length < 4) {
            throw new ApiException("INVALID_FILE", HttpStatus.BAD_REQUEST, "File is too small to be valid.");
        }

        boolean valid = false;
        switch (mimeType) {
            case "image/jpeg":
                valid = startsWith(fileBytes, JPEG_MAGIC);
                break;
            case "image/png":
                valid = startsWith(fileBytes, PNG_MAGIC);
                break;
            case "application/pdf":
                valid = startsWith(fileBytes, PDF_MAGIC);
                break;
            case "image/webp":
                valid = startsWith(fileBytes, WEBP_MAGIC_RIFF); // RIFF....WEBP
                break;
            default:
                valid = false;
        }

        if (!valid) {
            throw new ApiException("MIME_MISMATCH", HttpStatus.BAD_REQUEST,
                "File content does not match declared MIME type.");
        }
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) return false;
        for (int i = 0; i < prefix.length; i++) {
            if (data[i] != prefix[i]) return false;
        }
        return true;
    }

    private String getExtension(String mimeType) {
        return switch (mimeType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> ".bin";
        };
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
