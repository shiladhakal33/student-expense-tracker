package com.smartspend.service;

import com.smartspend.dto.TransactionDtos.*;
import com.smartspend.exception.ApiException;
import com.smartspend.model.Transaction;
import com.smartspend.model.TransactionType;
import com.smartspend.model.User;
import com.smartspend.repository.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public List<TransactionResponse> list(User user) {
        return transactionRepository.findByUserIdOrderByDateDescCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TransactionResponse create(User user, TransactionRequest req) {
        Transaction tx = new Transaction();
        tx.setUser(user);
        tx.setType("income".equalsIgnoreCase(req.type()) ? TransactionType.INCOME : TransactionType.EXPENSE);
        tx.setAmount(req.amount());
        tx.setCategory(req.category());
        tx.setSubcategory(req.subcategory());
        tx.setOtherText(req.otherText());
        tx.setDate(req.date());

        transactionRepository.save(tx);
        return toResponse(tx);
    }

    @Transactional
    public void delete(User user, Long transactionId) {
        Transaction tx = transactionRepository.findByIdAndUserId(transactionId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Transaction not found."));
        transactionRepository.delete(tx);
    }

    private TransactionResponse toResponse(Transaction tx) {
        return new TransactionResponse(
                tx.getId(),
                tx.getType().name().toLowerCase(),
                tx.getAmount(),
                tx.getCategory(),
                tx.getSubcategory(),
                tx.getOtherText(),
                tx.getDate(),
                tx.getCreatedAt()
        );
    }
}
