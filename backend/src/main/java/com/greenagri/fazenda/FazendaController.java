package com.greenagri.fazenda;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.fazenda.FazendaDtos.FazendaRequest;
import com.greenagri.fazenda.FazendaDtos.FazendaResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/fazendas")
@RequiredArgsConstructor
@Tag(name = "Fazendas")
public class FazendaController {

	private final FazendaService service;

	@GetMapping
	@Operation(summary = "Fazendas a que o usuário tem acesso")
	public List<FazendaResponse> minhas(@AuthenticationPrincipal Jwt jwt) {
		return service.doUsuario(jwt.getSubject());
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Cadastra uma fazenda; quem cadastra passa a ter acesso a ela")
	public FazendaResponse criar(@Valid @RequestBody FazendaRequest req, @AuthenticationPrincipal Jwt jwt) {
		return service.criar(req, jwt.getSubject());
	}

	@PutMapping("/{id}")
	public FazendaResponse atualizar(@PathVariable Long id, @Valid @RequestBody FazendaRequest req,
			@AuthenticationPrincipal Jwt jwt) {
		return service.atualizar(id, req, jwt.getSubject());
	}
}
