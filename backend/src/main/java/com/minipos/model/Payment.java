package com.minipos.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;


@Entity
@Table(name = "payments")
@Check(constraints = "amount_paid >= 0 AND change_amount >= 0")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true, foreignKey = @ForeignKey(name = "fk_payments_order"))
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentMethod paymentMethod;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amountPaid;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal changeAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PaymentStatus paymentStatus;

    @Column
    private Instant paidAt;

    public Payment(Order order, PaymentMethod paymentMethod, BigDecimal amountPaid,
                   BigDecimal changeAmount, PaymentStatus paymentStatus, Instant paidAt) {
        this.order = order;
        this.paymentMethod = paymentMethod;
        this.amountPaid = amountPaid;
        this.changeAmount = changeAmount;
        this.paymentStatus = paymentStatus;
        this.paidAt = paidAt;
    }

    public void markRefunded() {
        this.paymentStatus = PaymentStatus.REFUNDED;
    }
}
