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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.colheita.ColheitaDtos.ColheitaRequest;
import com.greenagri.colheita.ColheitaDtos.ColheitaResponse;
import com.greenagri.colheita.ColheitaDtos.ConclusaoRequest;
import com.greenagri.colheita.ColheitaDtos.EventoResponse;
import com.greenagri.colheita.ColheitaDtos.StatusRequest;

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
	@Operation(summary = "Lista colheitas, opcionalmente de uma safra (ex.: 2025/26)")
	public List<ColheitaResponse> listar(@RequestParam(required = false) String safra) {
		return service.listar(safra).stream().map(ColheitaResponse::de).toList();
	}

	@GetMapping("/safras")
	@Operation(summary = "Safras com colheitas cadastradas, da mais recente para a mais antiga")
	public List<String> safras() {
		return service.safras();
	}

	@GetMapping("/{id}")
	public ColheitaResponse obter(@PathVariable Long id) {
		return ColheitaResponse.de(service.obter(id));
	}

	@GetMapping("/{id}/eventos")
	@Operation(summary = "Histórico de mudanças de status (manuais e disparadas por dispositivos)")
	public List<EventoResponse> eventos(@PathVariable Long id) {
		return service.eventos(id).stream().map(EventoResponse::de).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ColheitaResponse criar(@Valid @RequestBody ColheitaRequest req, @AuthenticationPrincipal Jwt jwt) {
		return ColheitaResponse.de(service.criar(req, jwt.getClaimAsString("nome")));
	}

	@PutMapping("/{id}")
	@Operation(summary = "Atualiza os dados (o status muda só por /status e /concluir)")
	public ColheitaResponse atualizar(@PathVariable Long id, @Valid @RequestBody ColheitaRequest req) {
		return ColheitaResponse.de(service.atualizar(id, req));
	}

	@PostMapping("/{id}/status")
	@Operation(summary = "Avança o ciclo: planejada → em desenvolvimento → em colheita")
	public ColheitaResponse mudarStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest req,
			@AuthenticationPrincipal Jwt jwt) {
		return ColheitaResponse.de(service.mudarStatus(id, req.status(), req.observacao(), jwt.getClaimAsString("nome")));
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
