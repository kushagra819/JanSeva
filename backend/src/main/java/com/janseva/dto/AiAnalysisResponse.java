package com.janseva.dto;

import java.util.List;

public class AiAnalysisResponse {
    public String grievanceId;
    public String provider;
    public String modelVersion;
    public String taxonomyCode;
    public String departmentCode;
    public Double confidence;
    public String priority;
    public String priorityReason;
    public String detectedLanguage;
    public String sentiment;
    public Integer severityScore;
    public List<String> urgentReasons;
    public String explanation;
    public List<Prediction> topPredictions;
    public String decision;
    public Boolean requiresHumanReview;
}
