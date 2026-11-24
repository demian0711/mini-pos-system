# Mini POS & Payment System

## Tech stack

- Backend dùng Java 21, Spring Boot 3.5, Maven, Spring Web, Spring Data JPA, Spring Security, Bean Validation và Lombok.
- Xác thực JWT dùng JJWT. Luồng đăng nhập và xác thực sẽ được triển khai khi có nghiệp vụ người dùng.
- PostgreSQL 16 chạy qua Docker Compose. Hibernate dùng `ddl-auto: update` cho môi trường phát triển.
- Frontend dự kiến dùng React và Vite. Thư mục `frontend/` dành cho bước triển khai tiếp theo.
- `GET /api/health` là endpoint công khai trả HTTP 200 với `{"status":"OK"}`. CORS cho phép origin `http://localhost:5173`.

## Mô hình dữ liệu dự kiến

| Bảng | Cột chính | Ràng buộc và mục đích |
| --- | --- | --- |
| `users` | `id`, `username`, `password_hash`, `role`, `active`, `created_at` | `id` là khóa chính, `username` duy nhất. Lưu mật khẩu đã băm. |
| `products` | `id`, `sku`, `name`, `unit_price`, `stock_quantity`, `active` | `sku` duy nhất. Giá và tồn kho không âm. |
| `orders` | `id`, `cashier_id`, `status`, `total_amount`, `created_at` | `cashier_id` tham chiếu `users.id`. Mỗi đơn do một thu ngân tạo. |
| `order_items` | `id`, `order_id`, `product_id`, `quantity`, `unit_price` | Tham chiếu `orders.id` và `products.id`. Số lượng lớn hơn 0. Lưu đơn giá tại thời điểm bán. |
| `payments` | `id`, `order_id`, `method`, `status`, `amount`, `transaction_reference`, `created_at` | Quan hệ `OneToOne` với `orders`. `order_id` là khóa ngoại bắt buộc (`NOT NULL`) tham chiếu `orders.id` và có ràng buộc `UNIQUE`. Mỗi đơn có tối đa một bản ghi thanh toán. |

Giai đoạn này mô tả schema. Entity và bảng nghiệp vụ sẽ được triển khai cùng tính năng tương ứng.

## Quy ước code

- Luôn dùng DTO cho request và response. Controller không trả trực tiếp JPA Entity qua API.
- Controller xử lý HTTP và dùng `@Valid` để kiểm tra DTO đầu vào. Service xử lý nghiệp vụ và giao dịch. Repository truy cập dữ liệu.
- Dùng `BigDecimal` trong Java và `numeric` trong PostgreSQL cho số tiền. Tính tổng đơn hàng ở backend.
- Dùng `snake_case` cho bảng và cột. Đặt API dưới tiền tố `/api`.
