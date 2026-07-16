import os
from pathlib import Path

def create_file(path, content):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# DTOs
create_file("backend/src/main/java/com/janseva/dto/AuthRequest.java", """
package com.janseva.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
public class AuthRequest {
    @Email @NotBlank public String email;
    @NotBlank public String password;
}
""")

create_file("backend/src/main/java/com/janseva/dto/RegisterRequest.java", """
package com.janseva.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
public class RegisterRequest {
    @NotBlank public String name;
    @Email @NotBlank public String email;
    @NotBlank public String password;
    public String phone;
}
""")

create_file("backend/src/main/java/com/janseva/dto/AuthResponse.java", """
package com.janseva.dto;
public class AuthResponse {
    public String accessToken;
    public String refreshToken;
    public AuthResponse(String a, String r) { this.accessToken=a; this.refreshToken=r; }
}
""")

create_file("backend/src/main/java/com/janseva/dto/RefreshRequest.java", """
package com.janseva.dto;
public class RefreshRequest {
    public String refreshToken;
}
""")

create_file("backend/src/main/java/com/janseva/dto/CreateGrievanceRequest.java", """
package com.janseva.dto;
import jakarta.validation.constraints.NotBlank;
public class CreateGrievanceRequest {
    @NotBlank public String text;
    public Double latitude;
    public Double longitude;
}
""")

# Entities
create_file("backend/src/main/java/com/janseva/entity/User.java", """
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
""")

create_file("backend/src/main/java/com/janseva/entity/RefreshSession.java", """
package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="refresh_sessions")
public class RefreshSession {
    @Id @GeneratedValue public UUID id;
    public UUID userId;
    public String tokenHash;
    public OffsetDateTime expiresAt;
    public OffsetDateTime revokedAt;
    public UUID replacedBy;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
""")

create_file("backend/src/main/java/com/janseva/entity/Grievance.java", """
package com.janseva.entity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="grievances")
public class Grievance {
    @Id @GeneratedValue public UUID id;
    public String trackingCode;
    public UUID citizenId;
    public UUID assignedOfficerId;
    public String exactLocationCipher;
    public BigDecimal publicLatitude;
    public BigDecimal publicLongitude;
    public OffsetDateTime slaDueAt;
    public String status;
    public String priority;
    public String departmentCode;
    public String taxonomyCode;
    public BigDecimal confidence;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
""")

create_file("backend/src/main/java/com/janseva/entity/Attachment.java", """
package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="attachments")
public class Attachment {
    @Id @GeneratedValue public UUID id;
    public UUID grievanceId;
    public UUID uploadedBy;
    public String originalNameCipher;
    public String storedName;
    public String mimeType;
    public Long sizeBytes;
    public String sha256;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
""")

create_file("backend/src/main/java/com/janseva/entity/TimelineEvent.java", """
package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="timeline_events")
public class TimelineEvent {
    @Id @GeneratedValue public UUID id;
    public UUID grievanceId;
    public UUID actorId;
    public String eventType;
    public String oldStatus;
    public String newStatus;
    public String publicMessage;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
""")

create_file("backend/src/main/java/com/janseva/entity/Notification.java", """
package com.janseva.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name="notifications")
public class Notification {
    @Id @GeneratedValue public UUID id;
    public UUID userId;
    public UUID grievanceId;
    public String title;
    public String message;
    public OffsetDateTime readAt;
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
""")

# Repositories
create_file("backend/src/main/java/com/janseva/repository/UserRepository.java", """
package com.janseva.repository;
import com.janseva.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
}
""")

create_file("backend/src/main/java/com/janseva/repository/RefreshSessionRepository.java", """
package com.janseva.repository;
import com.janseva.entity.RefreshSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, UUID> {
    Optional<RefreshSession> findByTokenHash(String tokenHash);
}
""")

create_file("backend/src/main/java/com/janseva/repository/GrievanceRepository.java", """
package com.janseva.repository;
import com.janseva.entity.Grievance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GrievanceRepository extends JpaRepository<Grievance, UUID> {
    List<Grievance> findByCitizenId(UUID citizenId);
    List<Grievance> findByDepartmentCode(String departmentCode);
}
""")

print("Entities and Repositories scaffolded.")
