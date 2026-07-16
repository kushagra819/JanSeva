package com.janseva.dto;

import jakarta.validation.constraints.NotBlank;

public class ReviewRequest {
    @NotBlank(message = "Decision is required (APPROVE or OVERRIDE).")
    public String decision; // APPROVE or OVERRIDE

    public String overrideDepartmentCode; // Only if decision is OVERRIDE
    public String message; // Optional review notes
}
