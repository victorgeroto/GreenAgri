package com.greenagri.talhao;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.talhao.TalhaoDtos.TalhaoRequest;
import com.greenagri.talhao.TalhaoDtos.TalhaoResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/talhoes")
@RequiredArgsConstructor
@Tag(name = "Talhões")
public class TalhaoController {

	private final TalhaoService service;

	@GetMapping
	@Operation(summary = "Talhões com polígono GeoJSON, área calculada e centróide")
	public List<TalhaoResponse> listar() {
		return service.listar();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TalhaoResponse criar(@Valid @RequestBody TalhaoRequest req) {
		return service.paraResponse(service.criar(req));
	}

	@PutMapping("/{id}")
	public TalhaoResponse atualizar(@PathVariable Long id, @Valid @RequestBody TalhaoRequest req) {
		return service.paraResponse(service.atualizar(id, req));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('ADMIN')")
	public void excluir(@PathVariable Long id) {
		service.excluir(id);
	}
}
