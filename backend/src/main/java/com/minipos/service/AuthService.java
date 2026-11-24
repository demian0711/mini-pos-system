package com.minipos.service;

import com.minipos.dto.LoginRequest;
import com.minipos.dto.LoginResponse;
import com.minipos.exception.ApiException;
import com.minipos.model.User;
import com.minipos.repository.UserRepository;
import com.minipos.security.JwtService;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtService tokens;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwords, JwtService tokens) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.dummyHash = passwords.encode("unused-password");
    }

    public LoginResponse login(LoginRequest request) {
        User user = users.findByUsername(request.username().strip()).orElse(null);
        String hash = user == null ? dummyHash : user.getPassword();
        boolean matches = request.password().getBytes(StandardCharsets.UTF_8).length <= 72
                && passwords.matches(request.password(), hash);
        if (!matches || user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Tên đăng nhập hoặc mật khẩu không đúng.");
        }
        return new LoginResponse(tokens.issue(user), user.getUsername(), user.getFullName(), user.getRole());
    }
}
