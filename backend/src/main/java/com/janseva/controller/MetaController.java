package com.janseva.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class MetaController {

    @Value("${janseva.ai.auto-route-threshold:0.85}")
    private double autoRouteThreshold;

    @Value("${janseva.ai.review-threshold:0.55}")
    private double reviewThreshold;

    @GetMapping("/meta")
    public Map<String, Object> getMeta() {
        Map<String, Object> meta = new LinkedHashMap<>();

        meta.put("roles", List.of("CITIZEN", "OFFICER", "DEPARTMENT_HEAD", "ADMIN", "COMMISSIONER"));

        meta.put("departments", List.of(
            Map.of("code", "ROADS", "name", "Roads Department"),
            Map.of("code", "WATER", "name", "Water Supply Department"),
            Map.of("code", "ELECTRICITY", "name", "Electricity Department"),
            Map.of("code", "SANITATION", "name", "Sanitation Department"),
            Map.of("code", "PUBLIC_SAFETY", "name", "Public Safety & Law Enforcement"),
            Map.of("code", "PARKS_HORTICULTURE", "name", "Parks & Horticulture Department"),
            Map.of("code", "HEALTH", "name", "Health Department"),
            Map.of("code", "BUILDING_URBAN_PLANNING", "name", "Building & Urban Planning Department"),
            Map.of("code", "TRANSPORT", "name", "Transport Department"),
            Map.of("code", "PUBLIC_SERVICES", "name", "Other / General Grievances")
        ));

        meta.put("statuses", List.of(
            Map.of("code", "RECEIVED", "transitions", List.of("PROCESSING")),
            Map.of("code", "PROCESSING", "transitions", List.of("PENDING_REVIEW", "ROUTED")),
            Map.of("code", "PENDING_REVIEW", "transitions", List.of("ROUTED", "REJECTED")),
            Map.of("code", "ROUTED", "transitions", List.of("IN_PROGRESS", "REJECTED")),
            Map.of("code", "IN_PROGRESS", "transitions", List.of("ROUTED", "RESOLVED")),
            Map.of("code", "RESOLVED", "transitions", List.of()),
            Map.of("code", "REJECTED", "transitions", List.of())
        ));

        meta.put("priorities", List.of("NORMAL", "HIGH", "EMERGENCY"));

        meta.put("channels", List.of("WEB", "MOBILE", "CALL_CENTRE", "EMAIL"));

        meta.put("confidenceThresholds", Map.of(
            "autoRoute", autoRouteThreshold,
            "review", reviewThreshold
        ));

        return meta;
    }
}
