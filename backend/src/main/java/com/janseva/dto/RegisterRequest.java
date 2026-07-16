package com.janseva.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {
    @NotBlank(message = "Name is required.")
    public String name;

    @Email(message = "A valid email address is required.")
    @NotBlank(message = "Email is required.")
    public String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 12, message = "Password must be at least 12 characters.")
    public String password;

    public String phone;
}
