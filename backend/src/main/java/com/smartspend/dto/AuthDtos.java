package com.smartspend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank @Size(min = 3, max = 24) @Pattern(regexp = "^[A-Za-z0-9_]+$",
                    message = "3-24 characters: letters, numbers, underscore only.")
            String username,

            @NotBlank @Email
            String email,

            @NotBlank @Size(min = 6, message = "Password must be at least 6 characters.")
            String password
    ) {
    }

    public record LoginRequest(
            @NotBlank
            String usernameOrEmail,

            @NotBlank
            String password
    ) {
    }

    public record AuthResponse(
            String token,
            String username,
            String email
    ) {
    }

    public record FindAccountRequest(
            @NotBlank
            String username
    ) {
    }

    public record FindAccountResponse(
            String username
    ) {
    }

    public record ResetPasswordRequest(
            @NotBlank
            String username,

            @NotBlank @Size(min = 6, message = "Password must be at least 6 characters.")
            String newPassword
    ) {
    }

    public record UserProfileResponse(
            String username,
            String email
    ) {
    }

    public record MessageResponse(
            String message
    ) {
    }
}
