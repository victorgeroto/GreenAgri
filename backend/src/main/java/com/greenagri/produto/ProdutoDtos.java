package com.greenagri.produto;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class ProdutoDtos {

	private ProdutoDtos() {
	}

	public record ProdutoRequest(
			@NotBlank @Size(max = 40) String sku,
			@NotBlank @Size(max = 120) String nome,
			@NotNull Categoria categoria,
			@NotNull Unidade unidade,
			@NotNull @PositiveOrZero BigDecimal estoqueMinimo,
			/** Usado somente na criação: gera uma movimentação de entrada "Saldo inicial". */
			@PositiveOrZero BigDecimal quantidadeInicial,
			@Size(max = 120) String localizacao,
			@Size(max = 500) String descricao) {
	}

	public record ProdutoResponse(
			Long id, String sku, String nome, Categoria categoria, Unidade unidade,
			BigDecimal quantidadeAtual, BigDecimal estoqueMinimo, boolean abaixoDoMinimo,
			String localizacao, String descricao, Instant atualizadoEm) {

		public static ProdutoResponse de(Produto p) {
			return new ProdutoResponse(p.getId(), p.getSku(), p.getNome(), p.getCategoria(), p.getUnidade(),
					p.getQuantidadeAtual(), p.getEstoqueMinimo(), p.abaixoDoMinimo(), p.getLocalizacao(),
					p.getDescricao(), p.getAtualizadoEm());
		}
	}
}
