package com.janseva.test;

import com.janseva.service.FileService;
import com.janseva.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class FileUploadTest {

    @Autowired
    private FileService fileService;

    // 1. Reject oversized evidence
    @Test
    void rejectOversizedFile() {
        // Create a file larger than 10MB
        byte[] bigFile = new byte[11 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("file", "big.jpg", "image/jpeg", bigFile);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.upload(UUID.randomUUID(), UUID.randomUUID(), file)
        );
        assertEquals("FILE_TOO_LARGE", ex.getCode());
    }

    // 2. Reject mismatched extension and magic bytes
    @Test
    void rejectMismatchedMagicBytes() {
        // Claim it's JPEG but content is just text
        byte[] textContent = "This is not a JPEG file!".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", textContent);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.upload(UUID.randomUUID(), UUID.randomUUID(), file)
        );
        assertEquals("MIME_MISMATCH", ex.getCode());
    }

    // 3. Reject invalid MIME type
    @Test
    void rejectInvalidMimeType() {
        byte[] content = "console.log('hello');".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "script.js", "application/javascript", content);

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.upload(UUID.randomUUID(), UUID.randomUUID(), file)
        );
        assertEquals("INVALID_FILE_TYPE", ex.getCode());
    }

    // 4. Reject unauthorized evidence download
    @Test
    void rejectUnauthorizedDownload() {
        UUID fakeAttachmentId = UUID.randomUUID();

        ApiException ex = assertThrows(ApiException.class, () ->
            fileService.download(fakeAttachmentId, UUID.randomUUID(), "CITIZEN", null)
        );
        assertEquals("NOT_FOUND", ex.getCode());
    }
}
