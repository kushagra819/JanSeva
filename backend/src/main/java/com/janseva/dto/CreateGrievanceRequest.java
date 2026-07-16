package com.janseva.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateGrievanceRequest {
    @NotBlank(message = "Complaint must contain at least 10 characters.")
    @Size(min = 10, message = "Complaint must contain at least 10 characters.")
    public String text;

    public Double latitude;
    public Double longitude;
    public String idempotencyKey;
    public String channel; // WEB, MOBILE, CALL_CENTRE, EMAIL
}
