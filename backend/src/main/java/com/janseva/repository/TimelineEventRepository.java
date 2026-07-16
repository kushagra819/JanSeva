package com.janseva.repository;
import com.janseva.entity.TimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface TimelineEventRepository extends JpaRepository<TimelineEvent, UUID> {
    List<TimelineEvent> findByGrievanceId(UUID grievanceId);
}
