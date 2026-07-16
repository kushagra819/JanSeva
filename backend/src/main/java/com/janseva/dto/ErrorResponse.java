package com.janseva.dto;

import java.util.Map;

public class ErrorResponse {
    public String code;
    public String message;
    public Map<String, String> fieldErrors;
    public String traceId;

    public ErrorResponse() {}

    public ErrorResponse(String code, String message, Map<String, String> fieldErrors, String traceId) {
        this.code = code;
        this.message = message;
        this.fieldErrors = fieldErrors;
        this.traceId = traceId;
    }
}
