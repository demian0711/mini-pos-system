package com.minipos.dto;

import com.minipos.model.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;

public record CheckoutRequest(
        @NotEmpty List<@NotNull @Valid Item> items,
        @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal discountAmount,
        @NotNull PaymentMethod paymentMethod,
        @NotNull @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal amountPaid) {

    public record Item(@NotNull @Positive Long productId, @NotNull @Positive Integer quantity) {
    }
}
