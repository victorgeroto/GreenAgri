package com.greenagri.frota;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.frota.VeiculoDtos.VeiculoRequest;
import com.greenagri.frota.VeiculoDtos.VeiculoResponse;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/veiculos")
@RequiredArgsConstructor
@Tag(name = "Frota")
public class VeiculoController {

	private final VeiculoService service;

	@GetMapping
	public List<VeiculoResponse> listar() {
		return service.listar().stream().map(VeiculoResponse::de).toList();
	}

	@GetMapping("/{id}")
	public VeiculoResponse obter(@PathVariable Long id) {
		return VeiculoResponse.de(service.obter(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public VeiculoResponse criar(@Valid @RequestBody VeiculoRequest req) {
		return VeiculoResponse.de(service.criar(req));
	}

	@PutMapping("/{id}")
	public VeiculoResponse atualizar(@PathVariable Long id, @Valid @RequestBody VeiculoRequest req) {
		return VeiculoResponse.de(service.atualizar(id, req));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void excluir(@PathVariable Long id) {
		service.excluir(id);
	}
}
