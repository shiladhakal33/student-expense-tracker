package com.smartspend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "budgets")
public class Budget {

    @Id
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private Instant setAt = Instant.now();

    public Budget() {
    }

    public Budget(User user, Double amount) {
        this.user = user;
        this.amount = amount;
        this.setAt = Instant.now();
    }

    public Long getUserId() {
        return userId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Instant getSetAt() {
        return setAt;
    }

    public void setSetAt(Instant setAt) {
        this.setAt = setAt;
    }
}
