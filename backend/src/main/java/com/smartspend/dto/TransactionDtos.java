package com.smartspend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;
import java.time.LocalDate;

public class TransactionDtos {

    public record TransactionRequest(
            @NotBlank @Pattern(regexp = "income|expense", message = "type must be 'income' or 'expense'")
            String type,

            @NotNull @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be greater than zero.")
            Double amount,

            @NotBlank
            String category,

            String subcategory,

            String otherText,

            @NotNull
            LocalDate date
    ) {
    }

    public record TransactionResponse(
            Long id,
            String type,
            Double amount,
            String category,
            String subcategory,
            String otherText,
            LocalDate date,
            Instant createdAt
    ) {
    }
}
