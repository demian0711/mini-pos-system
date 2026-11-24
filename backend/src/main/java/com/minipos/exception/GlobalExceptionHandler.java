package com.minipos.exception;

import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleOtherErrors(Exception exception) {
        if (exception instanceof ErrorResponse response && response.getStatusCode().is4xxClientError()) {
            return ResponseEntity.status(response.getStatusCode()).headers(response.getHeaders())
                    .body(new ApiError("REQUEST_ERROR", "Máy chủ không thể xử lý yêu cầu này."));
        }
        log.error("Unhandled API error", exception);
        return ResponseEntity.internalServerError()
                .body(new ApiError("INTERNAL_ERROR", "Đã xảy ra lỗi khi xử lý yêu cầu."));
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleBusinessError(ApiException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new ApiError(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError field : exception.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(field.getField(), field.getDefaultMessage());
        }
        return ResponseEntity.badRequest().body(new ApiError(
                "VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ.", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleUnreadableBody() {
        return ResponseEntity.badRequest().body(new ApiError(
                "INVALID_REQUEST_BODY", "Nội dung JSON hoặc giá trị trong yêu cầu không hợp lệ."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> handleParameter(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(new ApiError(
                "INVALID_PARAMETER", "Tham số " + exception.getName() + " không hợp lệ."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleConstraintViolation() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(
                "DATA_CONFLICT", "Dữ liệu bị trùng hoặc vi phạm ràng buộc."));
    }

    @ExceptionHandler(PessimisticLockingFailureException.class)
    ResponseEntity<ApiError> handleLockConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(
                "CONCURRENT_UPDATE", "Dữ liệu đang được cập nhật. Vui lòng thử lại."));
    }
}
