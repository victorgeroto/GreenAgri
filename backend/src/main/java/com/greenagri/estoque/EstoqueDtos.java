package com.greenagri.estoque;

import java.math.BigDecimal;
import java.time.Instant;

import com.greenagri.produto.Unidade;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class EstoqueDtos {

	private EstoqueDtos() {
	}

	public record MovimentacaoRequest(
			@NotNull Long produtoId,
			@NotNull TipoMovimentacao tipo,
			@NotNull @PositiveOrZero BigDecimal quantidade,
			@Size(max = 200) String motivo,
			@Pattern(regexp = "^[0-9a-fA-F-]{36}$", message = "idCliente deve ser um UUID") String idCliente,
			Instant ocorridoEm) {
	}

	public record MovimentacaoResponse(
			Long id, Long produtoId, String produtoNome, Unidade unidade, TipoMovimentacao tipo,
			BigDecimal quantidade, BigDecimal saldoApos, String motivo, String responsavel,
			String idCliente, Instant ocorridoEm, Instant registradoEm) {

		public static MovimentacaoResponse de(Movimentacao m) {
			return new MovimentacaoResponse(m.getId(), m.getProduto().getId(), m.getProduto().getNome(),
					m.getProduto().getUnidade(), m.getTipo(), m.getQuantidade(), m.getSaldoApos(), m.getMotivo(),
					m.getResponsavel(), m.getIdCliente(), m.getOcorridoEm(), m.getRegistradoEm());
		}
	}
}
