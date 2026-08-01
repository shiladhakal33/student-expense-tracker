package com.smartspend.service;

import com.smartspend.dto.BudgetDtos.*;
import com.smartspend.model.Budget;
import com.smartspend.model.User;
import com.smartspend.repository.BudgetRepository;
import com.smartspend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;

    public BudgetService(BudgetRepository budgetRepository, UserRepository userRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
    }

    public Optional<BudgetResponse> get(User user) {
        return budgetRepository.findByUserId(user.getId())
                .map(b -> new BudgetResponse(b.getAmount(), b.getSetAt()));
    }

    @Transactional
    public BudgetResponse upsert(User user, BudgetRequest req) {
        Budget budget = budgetRepository.findByUserId(user.getId())
                .orElseGet(() -> new Budget(userRepository.getReferenceById(user.getId()), req.amount()));
        budget.setAmount(req.amount());
        budget.setSetAt(java.time.Instant.now());
        budgetRepository.save(budget);
        return new BudgetResponse(budget.getAmount(), budget.getSetAt());
    }
}