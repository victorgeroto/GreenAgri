package com.greenagri.colheita;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class ColheitaDtos {

	private static final BigDecimal KG_POR_SACA = BigDecimal.valueOf(60);

	private ColheitaDtos() {
	}

	public record ColheitaRequest(
			@NotBlank @Size(max = 60) String talhao,
			@NotBlank @Size(max = 60) String cultura,
			@NotNull @Positive BigDecimal areaHa,
			@NotNull LocalDate dataPlantio,
			@NotNull LocalDate previsaoColheita,
			@PositiveOrZero BigDecimal producaoEstimadaKg,
			StatusColheita status,
			Long produtoId,
			@Size(max = 500) String observacoes) {

		@AssertTrue(message = "A previsão de colheita deve ser posterior ao plantio")
		public boolean isPeriodoValido() {
			return dataPlantio == null || previsaoColheita == null || previsaoColheita.isAfter(dataPlantio);
		}
	}

	public record ConclusaoRequest(@NotNull LocalDate dataColheita, @NotNull @Positive BigDecimal producaoRealKg) {
	}

	public record ColheitaResponse(
			Long id, String talhao, String cultura, BigDecimal areaHa, LocalDate dataPlantio,
			LocalDate previsaoColheita, LocalDate dataColheita, BigDecimal producaoEstimadaKg,
			BigDecimal producaoRealKg, StatusColheita status, Long produtoId, String produtoNome,
			String observacoes, BigDecimal produtividadeSacasHa) {

		public static ColheitaResponse de(Colheita c) {
			BigDecimal producao = c.getProducaoRealKg() != null ? c.getProducaoRealKg() : c.getProducaoEstimadaKg();
			BigDecimal produtividade = producao == null ? null
					: producao.divide(KG_POR_SACA, 4, RoundingMode.HALF_UP)
						.divide(c.getAreaHa(), 1, RoundingMode.HALF_UP);
			return new ColheitaResponse(c.getId(), c.getTalhao(), c.getCultura(), c.getAreaHa(), c.getDataPlantio(),
					c.getPrevisaoColheita(), c.getDataColheita(), c.getProducaoEstimadaKg(), c.getProducaoRealKg(),
					c.getStatus(), c.getProduto() == null ? null : c.getProduto().getId(),
					c.getProduto() == null ? null : c.getProduto().getNome(), c.getObservacoes(), produtividade);
		}
	}
}
