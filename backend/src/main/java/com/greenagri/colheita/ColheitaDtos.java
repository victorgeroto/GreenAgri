package com.greenagri.colheita;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class ColheitaDtos {

	private static final BigDecimal KG_POR_SACA = BigDecimal.valueOf(60);

	private ColheitaDtos() {
	}

	public record ColheitaRequest(
			@NotNull Long talhaoId,
			@NotBlank @Size(max = 60) String cultura,
			/** Opcional: calculada pela data de plantio (jul–jun). */
			@Pattern(regexp = Safra.PADRAO, message = "Use o formato 2025/26") String safra,
			/** Opcional: assume a área do talhão desenhado. */
			@Positive BigDecimal areaHa,
			@NotNull LocalDate dataPlantio,
			@NotNull LocalDate previsaoColheita,
			@PositiveOrZero BigDecimal producaoEstimadaKg,
			/** Usado só na criação: PLANEJADA (padrão) ou EM_DESENVOLVIMENTO (já plantada). */
			StatusColheita status,
			Long produtoId,
			@Size(max = 500) String observacoes) {

		@AssertTrue(message = "A previsão de colheita deve ser posterior ao plantio")
		public boolean isPeriodoValido() {
			return dataPlantio == null || previsaoColheita == null || previsaoColheita.isAfter(dataPlantio);
		}
	}

	public record StatusRequest(@NotNull StatusColheita status, @Size(max = 255) String observacao) {
	}

	public record ConclusaoRequest(@NotNull LocalDate dataColheita, @NotNull @Positive BigDecimal producaoRealKg) {
	}

	public record ColheitaResponse(
			Long id, Long talhaoId, String talhao, String safra, String cultura, BigDecimal areaHa,
			LocalDate dataPlantio, LocalDate previsaoColheita, LocalDate dataColheita, BigDecimal producaoEstimadaKg,
			BigDecimal producaoRealKg, StatusColheita status, Instant statusDesde, Long produtoId, String produtoNome,
			String observacoes, BigDecimal produtividadeSacasHa) {

		public static ColheitaResponse de(Colheita c) {
			BigDecimal producao = c.getProducaoRealKg() != null ? c.getProducaoRealKg() : c.getProducaoEstimadaKg();
			BigDecimal produtividade = producao == null ? null
					: producao.divide(KG_POR_SACA, 4, RoundingMode.HALF_UP)
						.divide(c.getAreaHa(), 1, RoundingMode.HALF_UP);
			return new ColheitaResponse(c.getId(), c.getTalhao().getId(), c.getTalhao().getCodigo(), c.getSafra(),
					c.getCultura(), c.getAreaHa(), c.getDataPlantio(), c.getPrevisaoColheita(), c.getDataColheita(),
					c.getProducaoEstimadaKg(), c.getProducaoRealKg(), c.getStatus(), c.getStatusDesde(),
					c.getProduto() == null ? null : c.getProduto().getId(),
					c.getProduto() == null ? null : c.getProduto().getNome(), c.getObservacoes(), produtividade);
		}
	}

	public record EventoResponse(Long id, StatusColheita statusAnterior, StatusColheita statusNovo,
			ColheitaEvento.Origem origem, String responsavel, String observacao, Double latitude, Double longitude,
			Instant ocorridoEm) {

		public static EventoResponse de(ColheitaEvento e) {
			return new EventoResponse(e.getId(), e.getStatusAnterior(), e.getStatusNovo(), e.getOrigem(),
					e.getResponsavel(), e.getObservacao(), e.getLatitude(), e.getLongitude(), e.getOcorridoEm());
		}
	}
}
