package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="users")
public class User {
    @Id @GeneratedValue public UUID id;
    public String name;
    public String email;
    public String phoneCipher;
    public String passwordHash;
    public String role;
    public String departmentCode;
    public boolean active = true;
    public OffsetDateTime createdAt = OffsetDateTime.now();
    public OffsetDateTime updatedAt = OffsetDateTime.now();
}
