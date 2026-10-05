package com.greenagri.estoque;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.estoque.EstoqueDtos.MovimentacaoRequest;
import com.greenagri.estoque.EstoqueDtos.MovimentacaoResponse;
import com.greenagri.produto.ProdutoDtos.ProdutoResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/estoque")
@RequiredArgsConstructor
@Tag(name = "Estoque")
public class EstoqueController {

	private final EstoqueService service;

	@GetMapping("/movimentacoes")
	@Operation(summary = "Histórico de movimentações (mais recentes primeiro)")
	public List<MovimentacaoResponse> listar(@RequestParam(required = false) Long produtoId,
			@RequestParam(defaultValue = "100") int limite) {
		return service.listar(produtoId, limite).stream().map(MovimentacaoResponse::de).toList();
	}

	@PostMapping("/movimentacoes")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Registra entrada, saída ou ajuste de inventário",
			description = "Envie idCliente (UUID) para tornar o envio idempotente — usado pela sincronização offline.")
	public MovimentacaoResponse registrar(@Valid @RequestBody MovimentacaoRequest req,
			@AuthenticationPrincipal Jwt jwt) {
		return MovimentacaoResponse.de(service.registrar(req.produtoId(), req.tipo(), req.quantidade(), req.motivo(),
				jwt.getClaimAsString("nome"), req.idCliente(), req.ocorridoEm(), req.foto()));
	}

	@GetMapping("/alertas")
	@Operation(summary = "Produtos com saldo abaixo do estoque mínimo")
	public List<ProdutoResponse> alertas() {
		return service.abaixoDoMinimo().stream().map(ProdutoResponse::de).toList();
	}
}
