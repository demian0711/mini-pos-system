package com.minipos.repository;

import com.minipos.model.Product;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query(value = """
            select p.* from products p
            where p.active = true
              and (:category = '' or lower(p.category collate "und-x-icu") = lower(:category collate "und-x-icu"))
              and (:search = '' or strpos(lower(p.name collate "und-x-icu"), lower(:search collate "und-x-icu")) > 0
                               or strpos(lower(p.sku collate "und-x-icu"), lower(:search collate "und-x-icu")) > 0)
            order by p.name, p.id
            """, nativeQuery = true)
    List<Product> findActive(String category, String search);

    boolean existsBySku(String sku);

    boolean existsBySkuAndIdNot(String sku, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id in :ids order by p.id")
    List<Product> findAllForUpdate(Collection<Long> ids);
}
