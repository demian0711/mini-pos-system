package com.minipos.controller;

import com.minipos.dto.CheckoutRequest;
import com.minipos.dto.OrderResponse;
import com.minipos.dto.OrderSummary;
import com.minipos.model.OrderStatus;
import com.minipos.model.PaymentMethod;
import com.minipos.service.OrderService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(Principal principal, @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(principal.getName(), request);
    }

    @GetMapping
    public List<OrderSummary> history(@RequestParam(required = false) OrderStatus status,
                                      @RequestParam(required = false) PaymentMethod paymentMethod) {
        return orderService.history(status, paymentMethod);
    }

    @PostMapping("/{id}/refund")
    public OrderResponse refund(@PathVariable Long id) {
        return orderService.refund(id);
    }
}
