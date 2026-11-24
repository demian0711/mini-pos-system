package com.minipos.dto;

import com.minipos.model.Role;

public record LoginResponse(String token, String username, String fullName, Role role) {
}
