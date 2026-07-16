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
    private static final Map<String, String> ROUTE_OVERRIDES = new LinkedHashMap<>();

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
        DEPT_KEYWORDS.put("PUBLIC_SAFETY", List.of(
            "crime", "harassment", "illegal parking", "traffic signal", "encroachment", "hawker",
            "stray dog", "noise pollution", "fire hazard", "gas leak"
        ));
        DEPT_KEYWORDS.put("PARKS_HORTICULTURE", List.of(
            "park", "fallen tree", "tree branch", "playground", "tree cutting", "green space"
        ));
        DEPT_KEYWORDS.put("HEALTH", List.of(
            "disease", "outbreak", "unhygienic food", "dengue", "mosquito", "illegal doctor", "ambulance"
        ));
        DEPT_KEYWORDS.put("BUILDING_URBAN_PLANNING", List.of(
            "illegal construction", "building crack", "collapse risk", "building code", "hoarding", "public land"
        ));
        DEPT_KEYWORDS.put("TRANSPORT", List.of(
            "bus stop", "public transport", "bus delay", "overcrowding", "taxi meter", "railway crossing"
        ));
        DEPT_KEYWORDS.put("PUBLIC_SERVICES", List.of(
            "office", "service", "government", "public", "facility",
            "सरकारी", "कार्यालय", "सेवा"
        ));
        ROUTE_OVERRIDES.put("live wire", "ELECTRICITY.LIVE_WIRE");
        ROUTE_OVERRIDES.put("exposed wire", "ELECTRICITY.LIVE_WIRE");
        ROUTE_OVERRIDES.put("hanging wire", "ELECTRICITY.LIVE_WIRE");
        ROUTE_OVERRIDES.put("street light", "ELECTRICITY.STREETLIGHT");
        ROUTE_OVERRIDES.put("streetlight", "ELECTRICITY.STREETLIGHT");
        ROUTE_OVERRIDES.put("pipe burst", "WATER.PIPE_LEAK");
        ROUTE_OVERRIDES.put("burst pipe", "WATER.PIPE_LEAK");
        ROUTE_OVERRIDES.put("pipeline leak", "WATER.PIPE_LEAK");
        ROUTE_OVERRIDES.put("water gushing", "WATER.PIPE_LEAK");
        ROUTE_OVERRIDES.put("garbage not collected", "SANITATION.COLLECTION");
        ROUTE_OVERRIDES.put("blocked drain", "SANITATION.SEWER");
        ROUTE_OVERRIDES.put("sewer overflow", "SANITATION.SEWER");
        ROUTE_OVERRIDES.put("illegal construction", "BUILDING_URBAN_PLANNING.ILLEGAL_CONSTRUCTION");
        ROUTE_OVERRIDES.put("building collapse", "BUILDING_URBAN_PLANNING.SAFETY_HAZARD");
        ROUTE_OVERRIDES.put("railway crossing", "TRANSPORT.RAIL_CROSSING");
        ROUTE_OVERRIDES.put("rail signal", "TRANSPORT.RAIL_CROSSING");
        ROUTE_OVERRIDES.put("railway station", "TRANSPORT.SERVICE_DELAY");
        ROUTE_OVERRIDES.put("bus stop", "TRANSPORT.BUS_STOP");
        ROUTE_OVERRIDES.put("traffic signal", "PUBLIC_SAFETY.TRAFFIC_SIGNAL");
        ROUTE_OVERRIDES.put("pothole", "ROADS.POTHOLE");
    }

    private static final Map<String, String> DEPT_TO_TAXONOMY = Map.ofEntries(
        Map.entry("ELECTRICITY", "ELECTRICITY.OUTAGE"),
        Map.entry("WATER", "WATER.NO_SUPPLY"),
        Map.entry("ROADS", "ROADS.POTHOLE"),
        Map.entry("SANITATION", "SANITATION.SEWER"),
        Map.entry("PUBLIC_SAFETY", "PUBLIC_SAFETY.OTHER"),
        Map.entry("PARKS_HORTICULTURE", "PARKS_HORTICULTURE.OTHER"),
        Map.entry("HEALTH", "HEALTH.OTHER"),
        Map.entry("BUILDING_URBAN_PLANNING", "BUILDING_URBAN_PLANNING.OTHER"),
        Map.entry("TRANSPORT", "TRANSPORT.OTHER"),
        Map.entry("PUBLIC_SERVICES", "PUBLIC_SERVICES.OTHER")
    );

    private static final List<String> EMERGENCY_KEYWORDS = List.of(
        "emergency", "accident", "sparking", "electrocution", "fire", "collapse", "gas leak", "live wire",
        "death", "dying", "danger", "fatal", "explosion",
        "आपातकाल", "दुर्घटना", "करंट लगा", "आग", "धमाका"
    );

    private static final List<String> HIGH_PRIORITY_KEYWORDS = List.of(
        "urgent", "serious", "flooding", "sewage overflow", "major leak", "broken main",
        "pipe burst", "burst pipe", "water overflow", "water gushing", "no water for days",
        "children affected", "hospital"
    );

    public AiAnalysisResponse classify(String grievanceId, String text) {
        String lower = text.toLowerCase().replace('-', ' ').replace('/', ' ').replaceAll("\\s+", " ").trim();
        String overrideTaxonomy = ROUTE_OVERRIDES.entrySet().stream()
                .filter(entry -> lower.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);

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
        if (overrideTaxonomy != null) {
            bestDept = overrideTaxonomy.substring(0, overrideTaxonomy.indexOf('.'));
            bestScore = Math.max(bestScore, 3);
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
        if ("NORMAL".equals(priority)) {
            for (String kw : HIGH_PRIORITY_KEYWORDS) {
                if (lower.contains(kw)) {
                    priority = "HIGH";
                    priorityReason = "Detected urgent service-disruption phrase: '" + kw + "'.";
                    urgentReasons.add("major service disruption: " + kw);
                    break;
                }
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
        resp.taxonomyCode = overrideTaxonomy != null
                ? overrideTaxonomy
                : DEPT_TO_TAXONOMY.getOrDefault(bestDept, "PUBLIC_SERVICES.OTHER");
        resp.departmentCode = bestDept;
        resp.confidence = confidence;
        resp.priority = priority;
        resp.priorityReason = priorityReason;
        resp.detectedLanguage = text.chars().anyMatch(c -> c >= 0x0900 && c <= 0x097F) ? "Hindi / Marathi" : "English";
        resp.sentiment = "EMERGENCY".equals(priority) ? "DISTRESSED"
                : "HIGH".equals(priority) ? "CONCERNED"
                : List.of("frustrated", "angry", "fed up", "still not fixed").stream().anyMatch(lower::contains)
                    ? "FRUSTRATED" : "CALM";
        resp.severityScore = "EMERGENCY".equals(priority) ? 90 : "HIGH".equals(priority) ? 70 : 35;
        resp.urgentReasons = urgentReasons;
        resp.explanation = "Classified using keyword-based heuristic fallback (AI service unavailable).";
        resp.topPredictions = topPredictions;
        resp.decision = "HUMAN_REVIEW"; // Always require review for fallback
        resp.requiresHumanReview = true;

        return resp;
    }
}
