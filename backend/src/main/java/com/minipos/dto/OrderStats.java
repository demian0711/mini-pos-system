package com.minipos.dto;

import java.math.BigDecimal;

public record OrderStats(long ordersToday, BigDecimal paidRevenue, long refundedOrders) {
}
