package com.smartspend.service;

import com.smartspend.dto.AuthDtos.*;
import com.smartspend.exception.ApiException;
import com.smartspend.model.User;
import com.smartspend.repository.UserRepository;
import com.smartspend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsernameIgnoreCase(req.username())) {
            throw new ApiException(HttpStatus.CONFLICT, "That username is already taken.");
        }
        // Enforces email uniqueness so login-by-email always resolves to
        // exactly one account (this was a real bug in the original
        // localStorage-only prototype).
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with that email already exists. Try logging in instead.");
        }

        User user = new User(req.username(), req.email(), passwordEncoder.encode(req.password()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getEmail());
    }

    public AuthResponse login(LoginRequest req) {
        String key = req.usernameOrEmail().trim();

        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(key);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmailIgnoreCase(key);
        }

        // SECURITY: identical error for "no such account" and "wrong
        // password" so a caller can't enumerate which accounts exist.
        User user = userOpt.orElseThrow(() ->
                new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username/email or password."));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username/email or password.");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getEmail());
    }

    public FindAccountResponse findForReset(FindAccountRequest req) {
        User user = userRepository.findByUsernameIgnoreCase(req.username().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "We could not find an account with that username."));
        return new FindAccountResponse(user.getUsername());
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest req) {
        User user = userRepository.findByUsernameIgnoreCase(req.username().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found."));
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Password updated.");
    }
}
