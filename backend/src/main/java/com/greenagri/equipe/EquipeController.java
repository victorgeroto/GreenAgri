package com.greenagri.equipe;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.equipe.EquipeDtos.AlocacaoRequest;
import com.greenagri.equipe.EquipeDtos.AlocacaoResponse;
import com.greenagri.equipe.EquipeDtos.OperadorResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/equipe")
@RequiredArgsConstructor
@Tag(name = "Equipe de campo")
public class EquipeController {

	private final EquipeService service;

	@GetMapping("/operadores")
	@Operation(summary = "Operadores com situação (disponível, em atividade, ausente) e habilitações")
	public List<OperadorResponse> operadores() {
		return service.listar();
	}

	@GetMapping("/operadores/{id}/alocacoes")
	@Operation(summary = "Últimas 30 atividades do operador")
	public List<AlocacaoResponse> historico(@PathVariable Long id) {
		return service.historico(id).stream().map(AlocacaoResponse::de).toList();
	}

	@GetMapping("/alocacoes")
	@Operation(summary = "Atividades em andamento")
	public List<AlocacaoResponse> emAndamento() {
		return service.emAndamento().stream().map(AlocacaoResponse::de).toList();
	}

	@PostMapping("/alocacoes")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Aloca um operador numa atividade, máquina e/ou talhão")
	public AlocacaoResponse alocar(@Valid @RequestBody AlocacaoRequest req, @AuthenticationPrincipal Jwt jwt) {
		return AlocacaoResponse.de(service.alocar(req, jwt.getClaimAsString("nome")));
	}

	@PostMapping("/alocacoes/{id}/encerrar")
	@Operation(summary = "Encerra a atividade e libera a máquina")
	public AlocacaoResponse encerrar(@PathVariable Long id) {
		return AlocacaoResponse.de(service.encerrar(id));
	}
}
