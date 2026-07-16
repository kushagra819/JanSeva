package com.janseva.dto;

import jakarta.validation.constraints.NotBlank;

public class StatusUpdateRequest {
    @NotBlank(message = "New status is required.")
    public String status;

    public String message; // Optional public message
}
