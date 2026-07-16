package com.janseva.controller;

import com.janseva.entity.Notification;
import com.janseva.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Notification> getNotifications(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());
        return notificationService.getNotifications(userId);
    }

    @PatchMapping("/{id}/read")
    public Notification markAsRead(Authentication auth, @PathVariable UUID id) {
        UUID userId = UUID.fromString(auth.getName());
        return notificationService.markAsRead(id, userId);
    }
}
