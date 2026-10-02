package com.greenagri.colheita;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.colheita.ColheitaDtos.ColheitaRequest;
import com.greenagri.colheita.ColheitaDtos.ColheitaResponse;
import com.greenagri.colheita.ColheitaDtos.ConclusaoRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/colheitas")
@RequiredArgsConstructor
@Tag(name = "Colheitas")
public class ColheitaController {

	private final ColheitaService service;

	@GetMapping
	public List<ColheitaResponse> listar() {
		return service.listar().stream().map(ColheitaResponse::de).toList();
	}

	@GetMapping("/{id}")
	public ColheitaResponse obter(@PathVariable Long id) {
		return ColheitaResponse.de(service.obter(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ColheitaResponse criar(@Valid @RequestBody ColheitaRequest req) {
		return ColheitaResponse.de(service.criar(req));
	}

	@PutMapping("/{id}")
	public ColheitaResponse atualizar(@PathVariable Long id, @Valid @RequestBody ColheitaRequest req) {
		return ColheitaResponse.de(service.atualizar(id, req));
	}

	@PostMapping("/{id}/concluir")
	@Operation(summary = "Conclui a colheita e lança a produção no estoque do produto vinculado")
	public ColheitaResponse concluir(@PathVariable Long id, @Valid @RequestBody ConclusaoRequest req,
			@AuthenticationPrincipal Jwt jwt) {
		return ColheitaResponse.de(service.concluir(id, req, jwt.getClaimAsString("nome")));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void excluir(@PathVariable Long id) {
		service.excluir(id);
	}
}
