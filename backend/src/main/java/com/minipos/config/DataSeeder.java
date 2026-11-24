package com.minipos.config;

import com.minipos.model.Product;
import com.minipos.model.Role;
import com.minipos.model.User;
import com.minipos.repository.ProductRepository;
import com.minipos.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {
    private static final String DRINKS = "Đồ uống";
    private static final String SNACKS = "Đồ ăn nhẹ";
    private static final String SUPPLIES = "Vật dụng";
    private static final String SAMPLE_PASSWORD = "123456";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Keep the emptiness check and both inserts atomic across concurrent starts.
        jdbcTemplate.execute("""
                LOCK TABLE users, products, orders, order_items, payments IN SHARE ROW EXCLUSIVE MODE
                """);
        boolean hasData = Boolean.TRUE.equals(jdbcTemplate.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM users)
                    OR EXISTS (SELECT 1 FROM products)
                    OR EXISTS (SELECT 1 FROM orders)
                    OR EXISTS (SELECT 1 FROM order_items)
                    OR EXISTS (SELECT 1 FROM payments)
                """, Boolean.class));
        if (hasData) {
            return;
        }

        List<User> users = List.of(
                new User("admin", passwordEncoder.encode(SAMPLE_PASSWORD), "Quản trị viên", Role.ADMIN),
                new User("cashier", passwordEncoder.encode(SAMPLE_PASSWORD), "Thu ngân", Role.CASHIER));
        List<Product> products = List.of(
                product("SP001", "Nước suối", DRINKS, 7_000, 100),
                product("SP002", "Cà phê sữa", DRINKS, 25_000, 45),
                product("SP003", "Trà đào", DRINKS, 28_000, 38),
                product("SP004", "Nước cam", DRINKS, 22_000, 62),
                product("SP005", "Sữa tươi", DRINKS, 15_000, 80),
                product("SP006", "Khoai tây chiên", SNACKS, 18_000, 55),
                product("SP007", "Bánh quy bơ", SNACKS, 24_000, 50),
                product("SP008", "Bánh mì chà bông", SNACKS, 20_000, 30),
                product("SP009", "Hạt điều rang", SNACKS, 35_000, 25),
                product("SP010", "Thanh ngũ cốc", SNACKS, 16_000, 60),
                product("SP011", "Khăn giấy", SUPPLIES, 12_000, 75),
                product("SP012", "Khăn ướt", SUPPLIES, 14_000, 70),
                product("SP013", "Ly giấy", SUPPLIES, 10_000, 90),
                product("SP014", "Túi giấy", SUPPLIES, 5_000, 85),
                product("SP015", "Hộp đựng thực phẩm", SUPPLIES, 19_000, 20));

        userRepository.saveAll(users);
        productRepository.saveAll(products);
        log.info("Seeded {} sample users and {} sample products", users.size(), products.size());
    }

    private static Product product(String sku, String name, String category, long price, int stockQuantity) {
        return new Product(sku, name, category, BigDecimal.valueOf(price), stockQuantity, null, true);
    }
}
