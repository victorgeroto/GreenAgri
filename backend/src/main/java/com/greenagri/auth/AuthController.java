package com.greenagri.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.auth.AuthDtos.LoginRequest;
import com.greenagri.auth.AuthDtos.RegistroRequest;
import com.greenagri.auth.AuthDtos.TokenResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação")
public class AuthController {

	private final AuthService authService;

	@PostMapping("/login")
	@Operation(summary = "Autentica e devolve um token JWT")
	public TokenResponse login(@Valid @RequestBody LoginRequest req) {
		return authService.login(req);
	}

	@PostMapping("/registro")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Cria uma conta de operador")
	public TokenResponse registrar(@Valid @RequestBody RegistroRequest req) {
		return authService.registrar(req);
	}
}
