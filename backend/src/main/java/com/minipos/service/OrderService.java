package com.minipos.service;

import com.minipos.dto.CheckoutRequest;
import com.minipos.dto.OrderResponse;
import com.minipos.dto.OrderStats;
import com.minipos.dto.OrderSummary;
import com.minipos.exception.ApiException;
import com.minipos.model.Order;
import com.minipos.model.OrderItem;
import com.minipos.model.OrderStatus;
import com.minipos.model.Payment;
import com.minipos.model.PaymentMethod;
import com.minipos.model.PaymentStatus;
import com.minipos.model.Product;
import com.minipos.model.User;
import com.minipos.repository.OrderItemRepository;
import com.minipos.repository.OrderRepository;
import com.minipos.repository.PaymentRepository;
import com.minipos.repository.ProductRepository;
import com.minipos.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal VAT_RATE = new BigDecimal("0.08");
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999999999999.99");
    private static final ZoneId STORE_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;
    private final ProductRepository products;
    private final UserRepository users;

    @Transactional
    public OrderResponse checkout(String username, CheckoutRequest request) {
        User cashier = users.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "CASHIER_NOT_FOUND",
                        "Tài khoản thu ngân không còn tồn tại."));

        // Gộp dòng trùng và khóa sản phẩm theo ID trước khi đọc tồn kho.
        Map<Long, Long> quantities = new TreeMap<>();
        for (CheckoutRequest.Item item : request.items()) {
            quantities.merge(item.productId(), item.quantity().longValue(), Long::sum);
        }
        Map<Long, Product> lockedProducts = products.findAllForUpdate(quantities.keySet()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        List<SaleLine> lines = quantities.entrySet().stream()
                .map(entry -> prepareLine(lockedProducts.get(entry.getKey()), entry.getKey(), entry.getValue()))
                .toList();

        // Lấy đơn giá từ DB, trừ chiết khấu trước VAT 8% rồi làm tròn VAT đến hai chữ số.
        BigDecimal subtotal = lines.stream().map(SaleLine::lineTotal).reduce(ZERO, BigDecimal::add);
        BigDecimal discount = request.discountAmount() == null ? ZERO : request.discountAmount().setScale(2);
        if (discount.compareTo(subtotal) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DISCOUNT",
                    "Chiết khấu không được vượt quá tổng tiền hàng.");
        }
        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal vat = taxable.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(vat);
        if (subtotal.compareTo(MAX_AMOUNT) > 0 || total.compareTo(MAX_AMOUNT) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AMOUNT_TOO_LARGE", "Giá trị hóa đơn vượt giới hạn.");
        }

        BigDecimal amountPaid = request.amountPaid().setScale(2);
        BigDecimal change = calculateChange(request.paymentMethod(), amountPaid, total);
        Instant now = Instant.now();
        String date = LocalDate.ofInstant(now, STORE_ZONE).format(DateTimeFormatter.BASIC_ISO_DATE);
        String orderCode = "POS-" + date + "-" + UUID.randomUUID().toString().toUpperCase(Locale.ROOT);

        // Lưu hóa đơn, dòng hàng, thanh toán và tồn kho trong cùng giao dịch.
        Order order = orders.save(new Order(orderCode, cashier, subtotal, discount, vat, total, OrderStatus.PAID));
        List<OrderItem> items = lines.stream().map(line -> {
            Product product = line.product();
            product.changeStock(-line.quantity());
            return new OrderItem(order, product, product.getName(), line.quantity(), product.getPrice(), line.lineTotal());
        }).toList();
        orderItems.saveAll(items);
        Payment payment = payments.save(new Payment(order, request.paymentMethod(), amountPaid,
                change, PaymentStatus.SUCCESS, now));
        return toResponse(order, items, payment);
    }

    @Transactional(readOnly = true)
    public List<OrderSummary> history(OrderStatus status, PaymentMethod paymentMethod) {
        return orders.findHistory(status, paymentMethod);
    }

    @Transactional(readOnly = true)
    public OrderStats stats() {
        LocalDate today = LocalDate.now(STORE_ZONE);
        Instant start = today.atStartOfDay(STORE_ZONE).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(STORE_ZONE).toInstant();
        return orders.getStats(start, end, OrderStatus.PAID, OrderStatus.REFUNDED);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public OrderResponse detail(Long id) {
        Order order = orders.findById(id).orElseThrow(() -> orderNotFound(id));
        return toResponse(order, orderItems.findByOrderIdOrderByIdAsc(id),
                payments.findByOrderId(id).orElse(null));
    }

    @Transactional
    public OrderResponse refund(Long id) {
        // Khóa đơn trước khi kiểm tra trạng thái để mỗi đơn chỉ hoàn tồn kho một lần.
        Order order = orders.findForUpdate(id).orElseThrow(() -> orderNotFound(id));
        if (order.getStatus() != OrderStatus.PAID) {
            throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_REFUNDABLE",
                    "Chỉ có thể hoàn tiền cho đơn đang ở trạng thái PAID.");
        }
        Payment payment = payments.findByOrderId(id)
                .filter(existing -> existing.getPaymentStatus() == PaymentStatus.SUCCESS)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "PAYMENT_NOT_REFUNDABLE",
                        "Không có khoản thanh toán thành công để hoàn tiền."));

        List<OrderItem> items = orderItems.findByOrderIdOrderByIdAsc(id);
        Map<Long, Long> quantities = new TreeMap<>();
        for (OrderItem item : items) {
            quantities.merge(item.getProduct().getId(), item.getQuantity().longValue(), Long::sum);
        }
        if (!quantities.isEmpty()) {
            // Hoàn tồn kho cả cho sản phẩm đã ngừng bán. Lỗi ở bất kỳ dòng nào sẽ rollback toàn bộ.
            for (Product product : products.findAllForUpdate(quantities.keySet())) {
                long quantity = quantities.get(product.getId());
                if (product.getStockQuantity() + quantity > Integer.MAX_VALUE) {
                    throw new ApiException(HttpStatus.CONFLICT, "STOCK_LIMIT_EXCEEDED",
                            "Tồn kho sau hoàn tiền vượt giới hạn cho SKU " + product.getSku() + ".");
                }
                product.changeStock((int) quantity);
            }
        }
        order.markRefunded();
        payment.markRefunded();
        return toResponse(order, items, payment);
    }

    private ApiException orderNotFound(Long id) {
        return new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Không tìm thấy hóa đơn " + id + ".");
    }

    private SaleLine prepareLine(Product product, Long productId, long quantity) {
        if (product == null || !product.getActive()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_UNAVAILABLE",
                    "Không tìm thấy sản phẩm đang bán có ID " + productId + ".");
        }
        if (quantity > product.getStockQuantity()) {
            throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK",
                    "SKU " + product.getSku() + " chỉ còn " + product.getStockQuantity()
                            + ", yêu cầu " + quantity + ".");
        }
        BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));
        return new SaleLine(product, (int) quantity, lineTotal);
    }

    private BigDecimal calculateChange(PaymentMethod method, BigDecimal paid, BigDecimal total) {
        int comparison = paid.compareTo(total);
        if (method == PaymentMethod.CASH) {
            if (comparison < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_PAYMENT",
                        "Số tiền mặt nhận được nhỏ hơn tổng tiền hóa đơn.");
            }
            return paid.subtract(total);
        }
        if (comparison != 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PAYMENT_AMOUNT_MISMATCH",
                    "Số tiền thanh toán QR hoặc thẻ phải bằng tổng tiền hóa đơn.");
        }
        return ZERO;
    }

    private OrderResponse toResponse(Order order, List<OrderItem> items, Payment payment) {
        User cashier = order.getCashier();
        var cashierResponse = new OrderResponse.Cashier(cashier.getId(), cashier.getUsername(), cashier.getFullName());
        var lineResponses = items.stream().map(item -> new OrderResponse.Item(item.getProduct().getId(),
                item.getProductName(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal())).toList();
        var paymentResponse = payment == null ? null : new OrderResponse.Payment(
                payment.getPaymentMethod(), payment.getAmountPaid(), payment.getChangeAmount(),
                payment.getPaymentStatus(), payment.getPaidAt());
        return new OrderResponse(order.getId(), order.getOrderCode(), cashierResponse, order.getSubtotal(),
                order.getDiscountAmount(), order.getTaxAmount(), order.getTotalAmount(), order.getStatus(),
                order.getCreatedAt(), lineResponses, paymentResponse);
    }

    private record SaleLine(Product product, int quantity, BigDecimal lineTotal) {
    }
}
