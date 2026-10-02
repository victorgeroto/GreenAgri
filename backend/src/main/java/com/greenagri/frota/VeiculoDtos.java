package com.greenagri.frota;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class VeiculoDtos {

	/** Antecedência com que a manutenção passa a ser sinalizada. */
	static final int DIAS_AVISO_MANUTENCAO = 7;

	private VeiculoDtos() {
	}

	public record VeiculoRequest(
			@NotBlank @Size(max = 30) String identificacao,
			@NotBlank @Size(max = 120) String modelo,
			@NotNull TipoVeiculo tipo,
			@NotNull @Min(1950) @Max(2100) Integer ano,
			@NotNull @PositiveOrZero BigDecimal horimetro,
			@NotNull StatusVeiculo status,
			LocalDate proximaManutencao,
			@Size(max = 500) String observacoes) {
	}

	public record VeiculoResponse(
			Long id, String identificacao, String modelo, TipoVeiculo tipo, Integer ano, BigDecimal horimetro,
			StatusVeiculo status, LocalDate proximaManutencao, boolean manutencaoPendente, String observacoes) {

		public static VeiculoResponse de(Veiculo v) {
			boolean pendente = v.getProximaManutencao() != null && v.getStatus() != StatusVeiculo.INATIVO
					&& !v.getProximaManutencao().isAfter(LocalDate.now().plusDays(DIAS_AVISO_MANUTENCAO));
			return new VeiculoResponse(v.getId(), v.getIdentificacao(), v.getModelo(), v.getTipo(), v.getAno(),
					v.getHorimetro(), v.getStatus(), v.getProximaManutencao(), pendente, v.getObservacoes());
		}
	}
}
