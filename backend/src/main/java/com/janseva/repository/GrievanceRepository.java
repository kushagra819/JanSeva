package com.janseva.repository;

import com.janseva.entity.Grievance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GrievanceRepository extends JpaRepository<Grievance, UUID> {
    List<Grievance> findByCitizenId(UUID citizenId);
    List<Grievance> findByDepartmentCode(String departmentCode);
    Optional<Grievance> findByIdempotencyKey(String idempotencyKey);
    Optional<Grievance> findByTrackingCode(String trackingCode);
    List<Grievance> findByStatus(String status);

    @Query("SELECT g FROM Grievance g WHERE g.departmentCode = :dept " +
           "AND (:status IS NULL OR g.status = :status) " +
           "AND (:priority IS NULL OR g.priority = :priority)")
    List<Grievance> findByDeptWithFilters(
        @Param("dept") String departmentCode,
        @Param("status") String status,
        @Param("priority") String priority
    );

    @Query("SELECT g FROM Grievance g WHERE " +
           "(:status IS NULL OR g.status = :status) " +
           "AND (:priority IS NULL OR g.priority = :priority) " +
           "AND (:dept IS NULL OR g.departmentCode = :dept)")
    List<Grievance> findWithFilters(
        @Param("status") String status,
        @Param("priority") String priority,
        @Param("dept") String departmentCode
    );

    long countByStatus(String status);
    long countByDepartmentCode(String departmentCode);
    long countByPriority(String priority);
}
