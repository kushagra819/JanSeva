package com.janseva.service;

import com.janseva.dto.AiAnalysisResponse;
import com.janseva.dto.Prediction;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Keyword-based fallback classifier used when the HTTP AI service is unavailable.
 * Returns low confidence to force human review.
 */
@Component
public class HeuristicClassifier {

    private static final Map<String, List<String>> DEPT_KEYWORDS = new LinkedHashMap<>();

    static {
        DEPT_KEYWORDS.put("ELECTRICITY", List.of(
            "electricity", "power", "wire", "sparking", "transformer", "streetlight",
            "बिजली", "करंट", "तार", "बत्ती", "विद्युत", "light", "outage"
        ));
        DEPT_KEYWORDS.put("WATER", List.of(
            "water", "pipeline", "leak", "supply", "contamination", "tap", "tank",
            "पानी", "जल", "नल", "पाइप", "टंकी", "पाणी"
        ));
        DEPT_KEYWORDS.put("ROADS", List.of(
            "pothole", "road", "highway", "crack", "bridge", "footpath",
            "गड्ढा", "सड़क", "रास्ता", "खड्डा", "रस्ता"
        ));
        DEPT_KEYWORDS.put("SANITATION", List.of(
            "sewer", "garbage", "drain", "waste", "dirty", "trash", "dump",
            "गंदगी", "नाला", "कचरा", "सफाई", "गटर"
        ));
        DEPT_KEYWORDS.put("PUBLIC_SERVICES", List.of(
            "office", "service", "government", "public", "facility",
            "सरकारी", "कार्यालय", "सेवा"
        ));
    }

    private static final Map<String, String> DEPT_TO_TAXONOMY = Map.of(
        "ELECTRICITY", "ELECTRICITY.OUTAGE",
        "WATER", "WATER.NO_SUPPLY",
        "ROADS", "ROADS.POTHOLE",
        "SANITATION", "SANITATION.SEWER",
        "PUBLIC_SERVICES", "PUBLIC_SERVICES.OTHER"
    );

    private static final List<String> EMERGENCY_KEYWORDS = List.of(
        "emergency", "accident", "sparking", "electrocution", "fire", "collapse",
        "death", "dying", "danger", "fatal", "explosion",
        "आपातकाल", "दुर्घटना", "करंट लगा", "आग", "धमाका"
    );

    public AiAnalysisResponse classify(String grievanceId, String text) {
        String lower = text.toLowerCase();

        // Score each department by keyword hits
        Map<String, Integer> scores = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : DEPT_KEYWORDS.entrySet()) {
            int score = 0;
            for (String kw : entry.getValue()) {
                if (lower.contains(kw.toLowerCase())) {
                    score++;
                }
            }
            scores.put(entry.getKey(), score);
        }

        // Sort by score descending
        List<Map.Entry<String, Integer>> sorted = new ArrayList<>(scores.entrySet());
        sorted.sort((a, b) -> b.getValue() - a.getValue());

        String bestDept = sorted.get(0).getKey();
        int bestScore = sorted.get(0).getValue();

        // If no keywords matched, default to PUBLIC_SERVICES
        if (bestScore == 0) {
            bestDept = "PUBLIC_SERVICES";
        }

        // Low confidence to force human review
        double confidence = Math.min(0.5, bestScore * 0.15);

        // Priority detection
        String priority = "NORMAL";
        String priorityReason = "";
        List<String> urgentReasons = new ArrayList<>();
        for (String kw : EMERGENCY_KEYWORDS) {
            if (lower.contains(kw.toLowerCase())) {
                priority = "EMERGENCY";
                priorityReason = "Detected safety keyword: '" + kw + "'.";
                urgentReasons.add("unsafe condition: " + kw);
                break;
            }
        }

        // Build top 3 predictions
        List<Prediction> topPredictions = new ArrayList<>();
        for (int i = 0; i < Math.min(3, sorted.size()); i++) {
            String dept = sorted.get(i).getKey();
            double score = sorted.get(i).getValue() > 0 ? Math.min(0.5, sorted.get(i).getValue() * 0.15) : 0.01;
            topPredictions.add(new Prediction(dept, DEPT_TO_TAXONOMY.getOrDefault(dept, dept + ".OTHER"), score));
        }

        AiAnalysisResponse resp = new AiAnalysisResponse();
        resp.grievanceId = grievanceId;
        resp.provider = "heuristic-fallback";
        resp.modelVersion = "keyword-v1";
        resp.taxonomyCode = DEPT_TO_TAXONOMY.getOrDefault(bestDept, "PUBLIC_SERVICES.OTHER");
        resp.departmentCode = bestDept;
        resp.confidence = confidence;
        resp.priority = priority;
        resp.priorityReason = priorityReason;
        resp.urgentReasons = urgentReasons;
        resp.explanation = "Classified using keyword-based heuristic fallback (AI service unavailable).";
        resp.topPredictions = topPredictions;
        resp.decision = "HUMAN_REVIEW"; // Always require review for fallback
        resp.requiresHumanReview = true;

        return resp;
    }
}
