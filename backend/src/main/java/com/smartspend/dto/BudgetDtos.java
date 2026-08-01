package com.smartspend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public class BudgetDtos {

    public record BudgetRequest(
            @NotNull @DecimalMin(value = "0.0", inclusive = false, message = "Budget must be greater than zero.")
            Double amount
    ) {
    }

    public record BudgetResponse(
            Double amount,
            Instant setAt
    ) {
    }
}
