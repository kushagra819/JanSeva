package com.janseva.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class AssignRequest {
    @NotNull(message = "Officer ID is required.")
    public UUID officerId;
}
