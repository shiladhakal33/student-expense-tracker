package com.smartspend.controller;

import com.smartspend.dto.AuthDtos.UserProfileResponse;
import com.smartspend.dto.DeleteAccountRequest;
import com.smartspend.model.User;
import com.smartspend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new UserProfileResponse(user.getUsername(), user.getEmail()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMe(@AuthenticationPrincipal User user,
                                          @Valid @RequestBody DeleteAccountRequest req) {
        userService.deleteAccount(user, req.password());
        return ResponseEntity.noContent().build();
    }
}