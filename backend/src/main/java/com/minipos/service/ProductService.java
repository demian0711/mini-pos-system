package com.minipos.service;

import com.minipos.dto.ProductRequest;
import com.minipos.dto.ProductResponse;
import com.minipos.exception.ApiException;
import com.minipos.model.Product;
import com.minipos.repository.ProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository products;

    @Transactional(readOnly = true)
    public List<ProductResponse> find(String category, String search) {
        return products.findActive(category.strip(), search.strip()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        String sku = request.sku().strip();
        if (products.existsBySku(sku)) {
            throw duplicateSku(sku);
        }
        Product product = new Product(sku, request.name().strip(), request.category().strip(),
                request.price(), request.stockQuantity(), request.imageUrl(), true);
        return toResponse(products.save(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        // Dùng cùng khóa sản phẩm với checkout và hoàn tiền để đồng bộ cập nhật tồn kho.
        Product product = requireProductForUpdate(id);
        String sku = request.sku().strip();
        if (products.existsBySkuAndIdNot(sku, id)) {
            throw duplicateSku(sku);
        }
        product.updateDetails(sku, request.name().strip(), request.category().strip(),
                request.price(), request.stockQuantity(), request.imageUrl());
        return toResponse(product);
    }

    @Transactional
    public void delete(Long id) {
        // Giữ bản ghi sản phẩm để các hóa đơn cũ vẫn tham chiếu được.
        requireProductForUpdate(id).deactivate();
    }

    private Product requireProductForUpdate(Long id) {
        return products.findAllForUpdate(List.of(id)).stream().findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND",
                        "Không tìm thấy sản phẩm " + id + "."));
    }

    private ApiException duplicateSku(String sku) {
        return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_SKU", "SKU " + sku + " đã tồn tại.");
    }

    private ProductResponse toResponse(Product product) {
        return new ProductResponse(product.getId(), product.getSku(), product.getName(), product.getCategory(),
                product.getPrice(), product.getStockQuantity(), product.getImageUrl(), product.getActive());
    }
}
