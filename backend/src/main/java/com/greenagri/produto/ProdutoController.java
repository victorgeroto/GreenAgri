package com.greenagri.produto;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.produto.ProdutoDtos.ProdutoRequest;
import com.greenagri.produto.ProdutoDtos.ProdutoResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/produtos")
@RequiredArgsConstructor
@Tag(name = "Produtos")
public class ProdutoController {

	private final ProdutoService service;

	@GetMapping
	@Operation(summary = "Lista produtos com busca por nome/SKU e filtro de categoria")
	public List<ProdutoResponse> listar(@RequestParam(required = false) String q,
			@RequestParam(required = false) Categoria categoria) {
		return service.buscar(q, categoria).stream().map(ProdutoResponse::de).toList();
	}

	@GetMapping("/{id}")
	public ProdutoResponse obter(@PathVariable Long id) {
		return ProdutoResponse.de(service.obter(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ProdutoResponse criar(@Valid @RequestBody ProdutoRequest req, @AuthenticationPrincipal Jwt jwt) {
		return ProdutoResponse.de(service.criar(req, jwt.getClaimAsString("nome")));
	}

	@PutMapping("/{id}")
	@Operation(summary = "Atualiza o cadastro (o saldo só muda via movimentações)")
	public ProdutoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ProdutoRequest req) {
		return ProdutoResponse.de(service.atualizar(id, req));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('ADMIN')")
	public void excluir(@PathVariable Long id) {
		service.excluir(id);
	}
}
