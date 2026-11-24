# Mini POS & Payment System

Mini POS là ứng dụng bán hàng tại quầy cho cửa hàng nhỏ. Thu ngân tìm sản phẩm hoặc nhập SKU như khi quét mã vạch, tạo giỏ hàng và in hóa đơn. Quản trị viên theo dõi giao dịch, quản lý tồn kho và xử lý hoàn tiền.

## Giới thiệu và tính năng nổi bật

- **Thanh toán đa phương thức.** Tiền mặt tính tiền thối, VietQR hiển thị mã theo tổng hóa đơn và cho phép thu ngân xác nhận đã nhận tiền, còn Thẻ mô phỏng thao tác quẹt thẻ. VietQR dùng tài khoản demo và phần hoàn tiền ghi nhận trong hệ thống POS.
- **Xác thực và phân quyền.** Spring Security xác thực JWT và mật khẩu được băm bằng BCrypt. `CASHIER` có thể bán hàng và xem lịch sử. `ADMIN` có thêm quyền quản lý sản phẩm và hoàn tiền.
- **Tính tiền tại server.** Backend lấy đơn giá từ PostgreSQL, lưu tên và đơn giá tại thời điểm bán, sau đó tính VAT 8% trên số tiền sau giảm giá.
- **Checkout nhất quán.** `@Transactional` gom việc tạo đơn, ghi thanh toán và trừ kho trong một giao dịch. Khóa ghi bi quan (`PESSIMISTIC_WRITE`) theo thứ tự ID sản phẩm giúp hai checkout đồng thời tránh bán vượt tồn.
- **Hoàn tiền và hoàn tồn kho.** Backend khóa đơn, kiểm tra trạng thái, cộng lại tồn kho và cập nhật cả đơn lẫn thanh toán sang `REFUNDED` trong cùng giao dịch. Kiểm tra trạng thái sau khi khóa ngăn hoàn tồn hai lần.

## Tech Stack

| Tầng | Công nghệ |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA, Hibernate, JJWT, Bean Validation, Maven Wrapper |
| Frontend | React 19, Vite, Tailwind CSS, React Router DOM, Axios, Lucide React |
| Database | PostgreSQL 16 |
| Hạ tầng local | Docker và Docker Compose cho PostgreSQL |

## Kiến trúc và thiết kế hệ thống

React gọi REST API qua Axios và gửi JWT bằng header `Authorization`. Backend dùng DTO cho request và response, Service xử lý nghiệp vụ, Repository truy cập PostgreSQL.

### ERD

`payments.order_id` là khóa ngoại bắt buộc và duy nhất. Mỗi thanh toán thuộc đúng một đơn, mỗi đơn có tối đa một thanh toán ở cấp schema. Checkout thành công tạo đơn và thanh toán trong cùng giao dịch.

```mermaid
erDiagram
    users ||..o{ orders : "xử lý"
    orders ||..o{ order_items : "gồm"
    products ||..o{ order_items : "được bán trong"
    orders ||..o| payments : "có"

    users {
        bigint id PK
        varchar username UK
        varchar password_hash
        varchar full_name
        varchar role
    }
    products {
        bigint id PK
        varchar sku UK
        varchar name
        varchar category
        numeric price
        integer stock_quantity
        varchar image_url
        boolean active
    }
    orders {
        bigint id PK
        varchar order_code UK
        bigint cashier_id FK
        numeric subtotal
        numeric discount_amount
        numeric tax_amount
        numeric total_amount
        varchar status
        timestamptz created_at
    }
    order_items {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        varchar product_name
        integer quantity
        numeric unit_price
        numeric line_total
    }
    payments {
        bigint id PK
        bigint order_id FK, UK
        varchar payment_method
        numeric amount_paid
        numeric change_amount
        varchar payment_status
        timestamptz paid_at
    }
```

### Sequence Diagram — POS Checkout

```mermaid
sequenceDiagram
    actor Cashier as Thu ngân
    participant UI as React POS
    participant Security as Spring Security
    participant API as OrderController
    participant Service as OrderService
    participant DB as PostgreSQL

    Cashier->>UI: Xác nhận thanh toán
    UI->>Security: POST /api/orders/checkout kèm Bearer JWT
    Security->>Security: Xác thực JWT và kiểm tra vai trò
    Security->>API: Chuyển request hợp lệ
    API->>API: Validate CheckoutRequest
    API->>Service: checkout(username, request)
    Note over Service,DB: Bắt đầu giao dịch @Transactional
    Service->>Service: Xác định thu ngân và gộp số lượng trùng sản phẩm
    Service->>DB: Đọc giá và khóa sản phẩm theo ID
    DB-->>Service: Sản phẩm, đơn giá, tồn kho
    Service->>Service: Kiểm tra tồn kho và chiết khấu
    Service->>Service: Tính tạm tính, VAT 8% và tổng tiền
    Service->>Service: Kiểm tra số tiền nhận và tính tiền thối
    alt Checkout hợp lệ và ghi dữ liệu thành công
        Service->>DB: Tạo Order và OrderItem, trừ tồn kho, lưu Payment
        Service->>DB: Commit giao dịch
        Service-->>API: OrderResponse
        API-->>UI: 201 Created và dữ liệu hóa đơn
        UI-->>Cashier: Mở Receipt Preview
    else Có lỗi kiểm tra hoặc ghi dữ liệu
        Service->>DB: Rollback giao dịch
        Service-->>API: Lỗi nghiệp vụ hoặc lỗi ghi dữ liệu
        API-->>UI: Mã lỗi và thông báo từ GlobalExceptionHandler
        UI-->>Cashier: Hiển thị lỗi thanh toán
    end
```

## Ảnh chụp màn hình

![Màn hình POS có danh mục và giỏ hàng ba sản phẩm](docs/screenshots/01-pos-terminal.png)

*Quầy POS hiển thị ảnh sản phẩm, giỏ hàng, tạm tính, VAT 8% và tổng thanh toán.*

![Hộp thoại thanh toán với mã VietQR đã tải](docs/screenshots/02-payment-vietqr.png)

*VietQR hiển thị mã theo giá trị đơn và nút xác nhận đã nhận tiền.*

![Bản xem trước hóa đơn khổ in nhiệt](docs/screenshots/03-receipt-preview.png)

*Hóa đơn ghi các dòng hàng, phương thức thanh toán và tổng tiền, kèm thao tác in.*

![Lịch sử đơn hàng cùng thống kê, bộ lọc và thao tác hoàn tiền](docs/screenshots/04-order-history.png)

*Đơn VietQR vừa tạo xuất hiện trong lịch sử với bộ lọc và nút Hoàn tiền của Admin.*

## Cài đặt và chạy dự án

Yêu cầu **JDK 21**, **Node.js 22.12+** và **Docker Compose**. Chạy từ thư mục gốc của repo.

1. **Khởi động PostgreSQL.**

   ```powershell
   docker compose up -d --wait postgres
   ```

2. **Chạy backend ở cổng 8080** trong một terminal mới. Đặt `JAVA_HOME` trỏ tới JDK 21 nếu máy cài nhiều phiên bản Java.

   ```powershell
   cd backend
   .\mvnw.cmd spring-boot:run
   ```

   Trên macOS/Linux dùng `sh ./mvnw spring-boot:run`. Có thể kiểm tra backend tại [`/api/health`](http://localhost:8080/api/health).

3. **Chạy frontend** trong một terminal khác tại thư mục gốc.

   ```powershell
   cd frontend
   npm.cmd ci
   npm.cmd run dev
   ```

   Trên macOS/Linux dùng `npm ci` và `npm run dev`. Mở [http://localhost:5173/login](http://localhost:5173/login).

Backend tự nạp tài khoản và sản phẩm mẫu khi cả năm bảng nghiệp vụ đều trống.

| Vai trò | Tên đăng nhập | Mật khẩu |
| --- | --- | --- |
| `ADMIN` | `admin` | `123456` |
| `CASHIER` | `cashier` | `123456` |
