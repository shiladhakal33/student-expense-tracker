package com.smartspend.controller;

import com.smartspend.dto.TransactionDtos.*;
import com.smartspend.model.User;
import com.smartspend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> list(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(transactionService.list(user));
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@AuthenticationPrincipal User user,
                                                        @Valid @RequestBody TransactionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(user, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable Long id) {
        transactionService.delete(user, id);
        return ResponseEntity.noContent().build();
    }
}
