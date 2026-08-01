package com.smartspend.repository;

import com.smartspend.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserIdOrderByDateDescCreatedAtDesc(Long userId);
    Optional<Transaction> findByIdAndUserId(Long id, Long userId);
    void deleteByUserId(Long userId);
}
