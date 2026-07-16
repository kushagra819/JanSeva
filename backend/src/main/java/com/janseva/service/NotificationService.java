package com.janseva.service;

import com.janseva.entity.Notification;
import com.janseva.exception.ApiException;
import com.janseva.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    public void createNotification(UUID userId, UUID grievanceId, String title, String message) {
        Notification n = new Notification();
        n.userId = userId;
        n.grievanceId = grievanceId;
        n.title = title;
        n.message = message;
        n.createdAt = OffsetDateTime.now();
        repo.save(n);
    }

    public List<Notification> getNotifications(UUID userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnread(UUID userId) {
        return repo.findByUserIdAndReadAtIsNullOrderByCreatedAtDesc(userId);
    }

    public Notification markAsRead(UUID notificationId, UUID userId) {
        Notification n = repo.findById(notificationId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Notification not found."));

        // Ownership check
        if (!n.userId.equals(userId)) {
            throw new ApiException("FORBIDDEN", HttpStatus.FORBIDDEN, "Not your notification.");
        }

        n.readAt = OffsetDateTime.now();
        return repo.save(n);
    }
}
