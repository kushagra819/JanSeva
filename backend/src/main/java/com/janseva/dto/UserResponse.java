package com.janseva.dto;

public class UserResponse {
    public String id;
    public String name;
    public String email;
    public String role;
    public String departmentCode;
    public boolean active;
    public String createdAt;

    public UserResponse() {}

    public UserResponse(String id, String name, String email, String role, String departmentCode, boolean active, String createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.departmentCode = departmentCode;
        this.active = active;
        this.createdAt = createdAt;
    }
}
