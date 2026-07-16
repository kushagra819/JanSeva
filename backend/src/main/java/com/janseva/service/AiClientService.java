package com.janseva.service;

import com.janseva.dto.AiAnalysisResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

@Service
public class AiClientService {
    @Value("${janseva.ai.url}")
    private String aiUrl;

    @Value("${janseva.ai.provider:http}")
    private String aiProvider;

    private final RestTemplate restTemplate = new RestTemplate();
    private final HeuristicClassifier heuristicClassifier;

    public AiClientService(HeuristicClassifier heuristicClassifier) {
        this.heuristicClassifier = heuristicClassifier;
    }

    public AiAnalysisResponse analyzeGrievance(String grievanceId, String text) {
        // If provider is explicitly heuristic, skip HTTP
        if ("heuristic".equalsIgnoreCase(aiProvider)) {
            return heuristicClassifier.classify(grievanceId, text);
        }

        // Try HTTP AI service
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = new HashMap<>();
        body.put("grievanceId", grievanceId);
        body.put("text", text);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
        try {
            AiAnalysisResponse response = restTemplate.postForObject(aiUrl, request, AiAnalysisResponse.class);
            if (response != null) {
                return response;
            }
        } catch (Exception e) {
            System.err.println("AI Service unavailable, falling back to heuristic: " + e.getMessage());
        }

        // Fallback to heuristic classifier
        return heuristicClassifier.classify(grievanceId, text);
    }
}
