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
			Instant ocorridoEm,
			@Size(max = 400_000, message = "A foto deve ter até 300 KB")
			@Pattern(regexp = "^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$", message = "Foto inválida")
			String foto) {
	}

	public record MovimentacaoResponse(
			Long id, Long produtoId, String produtoNome, Unidade unidade, TipoMovimentacao tipo,
			BigDecimal quantidade, BigDecimal saldoApos, String motivo, String responsavel,
			String idCliente, Instant ocorridoEm, Instant registradoEm, String foto) {

		public static MovimentacaoResponse de(Movimentacao m) {
			return new MovimentacaoResponse(m.getId(), m.getProduto().getId(), m.getProduto().getNome(),
					m.getProduto().getUnidade(), m.getTipo(), m.getQuantidade(), m.getSaldoApos(), m.getMotivo(),
					m.getResponsavel(), m.getIdCliente(), m.getOcorridoEm(), m.getRegistradoEm(), m.getFoto());
		}
	}
}
