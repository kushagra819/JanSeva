package com.janseva.config;

import com.janseva.repository.UserRepository;
import com.janseva.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepo;
    private final AuthService authService;

    @Value("${janseva.admin.email:admin@janseva.gov}")
    private String adminEmail;

    @Value("${janseva.admin.password:Admin123!@#pass}")
    private String adminPassword;

    public AdminBootstrap(UserRepository userRepo, AuthService authService) {
        this.userRepo = userRepo;
        this.authService = authService;
    }

    @Override
    public void run(ApplicationArguments args) {
        String normalized = adminEmail.toLowerCase();
        if (userRepo.findByEmail(normalized).isEmpty()) {
            try {
                authService.createStaffUser(
                    "System Administrator",
                    adminEmail,
                    adminPassword,
                    "ADMIN",
                    null // Admin is citywide, no department
                );
                System.out.println("Admin user bootstrapped: " + normalized);
            } catch (Exception e) {
                System.err.println("Failed to bootstrap admin: " + e.getMessage());
            }
        }
    }
}
