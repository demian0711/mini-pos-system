package com.minipos.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Check;


@Entity
@Table(name = "products")
@Check(constraints = "price >= 0 AND stock_quantity >= 0")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String sku;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stockQuantity;

    @Column(length = 2048)
    private String imageUrl;

    @Column(nullable = false)
    private Boolean active;

    public Product(String sku, String name, String category, BigDecimal price,
                   Integer stockQuantity, String imageUrl, Boolean active) {
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.imageUrl = imageUrl;
        this.active = active;
    }

    public void updateDetails(String sku, String name, String category, BigDecimal price,
                              Integer stockQuantity, String imageUrl) {
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stockQuantity = stockQuantity;
        this.imageUrl = imageUrl;
    }

    public void deactivate() {
        this.active = false;
    }

    public void changeStock(int delta) {
        this.stockQuantity = Math.addExact(this.stockQuantity, delta);
    }
}
