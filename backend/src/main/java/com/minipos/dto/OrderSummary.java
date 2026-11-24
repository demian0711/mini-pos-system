package com.minipos.dto;

import com.minipos.model.OrderStatus;
import com.minipos.model.PaymentMethod;
import com.minipos.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record OrderSummary(Long id, String orderCode, String cashierUsername, BigDecimal subtotal,
                           BigDecimal discountAmount, BigDecimal taxAmount, BigDecimal totalAmount,
                           OrderStatus status, Instant createdAt, PaymentMethod paymentMethod,
                           PaymentStatus paymentStatus) {
}
