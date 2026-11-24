package com.minipos.repository;

import com.minipos.dto.OrderSummary;
import com.minipos.model.Order;
import com.minipos.model.OrderStatus;
import com.minipos.model.PaymentMethod;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findForUpdate(Long id);

    @Query("""
            select new com.minipos.dto.OrderSummary(
                o.id, o.orderCode, c.username, o.subtotal, o.discountAmount, o.taxAmount,
                o.totalAmount, o.status, o.createdAt, p.paymentMethod, p.paymentStatus)
            from Order o
            join o.cashier c
            left join Payment p on p.order = o
            where (:status is null or o.status = :status)
              and (:paymentMethod is null or p.paymentMethod = :paymentMethod)
            order by o.createdAt desc, o.id desc
            """)
    List<OrderSummary> findHistory(OrderStatus status, PaymentMethod paymentMethod);
}
