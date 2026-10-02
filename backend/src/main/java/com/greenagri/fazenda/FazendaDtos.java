package com.greenagri.fazenda;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class FazendaDtos {

	private FazendaDtos() {
	}

	public record FazendaRequest(
			@NotBlank @Size(max = 120) String nome,
			@NotBlank @Size(max = 120) String municipio,
			@NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "Use a sigla do estado, ex.: PR") String uf,
			@DecimalMin("-90") @DecimalMax("90") Double latitude,
			@DecimalMin("-180") @DecimalMax("180") Double longitude) {
	}

	public record FazendaResponse(Long id, String nome, String municipio, String uf, Double latitude, Double longitude) {

		static FazendaResponse de(Fazenda f) {
			return new FazendaResponse(f.getId(), f.getNome(), f.getMunicipio(), f.getUf(), f.getLatitude(),
					f.getLongitude());
		}
	}
}
