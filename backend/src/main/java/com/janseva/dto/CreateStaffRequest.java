package com.janseva.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateStaffRequest {
    @NotBlank(message = "Name is required.")
    public String name;

    @Email(message = "A valid email address is required.")
    @NotBlank(message = "Email is required.")
    public String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 12, message = "Password must be at least 12 characters.")
    public String password;

    @NotBlank(message = "Role is required.")
    public String role; // OFFICER, DEPARTMENT_HEAD, ADMIN, COMMISSIONER

    public String departmentCode; // Required for OFFICER and DEPARTMENT_HEAD
}
