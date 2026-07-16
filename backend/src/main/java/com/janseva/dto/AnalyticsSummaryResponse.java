package com.janseva.dto;

import java.util.Map;

public class AnalyticsSummaryResponse {
    public long totalComplaints;
    public Map<String, Long> byStatus;
    public Map<String, Long> byDepartment;
    public Map<String, Long> byPriority;
    public long resolvedCount;
    public long pendingCount;
    public long emergencyCount;

    public AnalyticsSummaryResponse() {}
}
