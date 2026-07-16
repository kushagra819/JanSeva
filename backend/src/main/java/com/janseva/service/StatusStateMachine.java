package com.janseva.service;

import com.janseva.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class StatusStateMachine {

    private static final Map<String, Set<String>> TRANSITIONS = new LinkedHashMap<>();

    static {
        TRANSITIONS.put("RECEIVED", Set.of("PROCESSING"));
        TRANSITIONS.put("PROCESSING", Set.of("PENDING_REVIEW", "ROUTED"));
        TRANSITIONS.put("PENDING_REVIEW", Set.of("ROUTED", "REJECTED"));
        TRANSITIONS.put("ROUTED", Set.of("IN_PROGRESS", "REJECTED"));
        TRANSITIONS.put("IN_PROGRESS", Set.of("ROUTED", "RESOLVED"));
        TRANSITIONS.put("RESOLVED", Set.of());
        TRANSITIONS.put("REJECTED", Set.of());
    }

    public boolean isValidTransition(String from, String to) {
        Set<String> allowed = TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    public void validateTransition(String from, String to) {
        if (!isValidTransition(from, to)) {
            throw new ApiException("INVALID_TRANSITION", HttpStatus.UNPROCESSABLE_ENTITY,
                "Cannot transition from " + from + " to " + to + ".");
        }
    }

    public Set<String> getAllowedTransitions(String status) {
        return TRANSITIONS.getOrDefault(status, Set.of());
    }

    public static Set<String> getAllStatuses() {
        return TRANSITIONS.keySet();
    }
}
