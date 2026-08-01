package com.smartspend.controller;

import com.smartspend.dto.BudgetDtos.*;
import com.smartspend.model.User;
import com.smartspend.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    public ResponseEntity<BudgetResponse> get(@AuthenticationPrincipal User user) {
        return budgetService.get(user)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public ResponseEntity<BudgetResponse> upsert(@AuthenticationPrincipal User user,
                                                  @Valid @RequestBody BudgetRequest req) {
        return ResponseEntity.ok(budgetService.upsert(user, req));
    }
}
