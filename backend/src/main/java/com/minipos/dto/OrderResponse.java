package com.minipos.dto;

import com.minipos.model.OrderStatus;
import com.minipos.model.PaymentMethod;
import com.minipos.model.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(Long id, String orderCode, Cashier cashier, BigDecimal subtotal,
                            BigDecimal discountAmount, BigDecimal taxAmount, BigDecimal totalAmount,
                            OrderStatus status, Instant createdAt, List<Item> items, Payment payment) {

    public record Cashier(Long id, String username, String fullName) {
    }

    public record Item(Long productId, String productName, Integer quantity, BigDecimal unitPrice,
                       BigDecimal lineTotal) {
    }

    public record Payment(PaymentMethod paymentMethod, BigDecimal amountPaid, BigDecimal changeAmount,
                          PaymentStatus paymentStatus, Instant paidAt) {
    }
}
