package com.greenagri.talhao;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class TalhaoDtos {

	private TalhaoDtos() {
	}

	public record TalhaoRequest(
			@NotBlank @Size(max = 20) String codigo,
			@NotBlank @Size(max = 120) String nome,
			/** Opcional: talhão pode ser cadastrado antes de ser desenhado. */
			Poligono geometria) {
	}

	public record TalhaoResponse(Long id, String codigo, String nome, Poligono geometria, BigDecimal areaHa,
			Double latitude, Double longitude) {
	}
}
