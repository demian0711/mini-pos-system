package com.minipos.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank @Size(max = 64) String sku,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 100) String category,
        @NotNull @PositiveOrZero @Digits(integer = 17, fraction = 2) BigDecimal price,
        @NotNull @PositiveOrZero Integer stockQuantity,
        @Size(max = 2048) String imageUrl) {
}
