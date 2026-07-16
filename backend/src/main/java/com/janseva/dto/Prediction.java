package com.janseva.dto;

public class Prediction {
    public String departmentCode;
    public String taxonomyCode;
    public double confidence;

    public Prediction() {}

    public Prediction(String departmentCode, String taxonomyCode, double confidence) {
        this.departmentCode = departmentCode;
        this.taxonomyCode = taxonomyCode;
        this.confidence = confidence;
    }
}
