package com.greenagri.produto;

import java.math.BigDecimal;
import java.util.Optional;

public enum Unidade {
	KG(1), SACA(60), TONELADA(1000), LITRO(0), UNIDADE(0);

	private final int kgPorUnidade;

	Unidade(int kgPorUnidade) {
		this.kgPorUnidade = kgPorUnidade;
	}

	/** Fator de conversão para kg; vazio para unidades que não representam massa. */
	public Optional<BigDecimal> kgPorUnidade() {
		return kgPorUnidade == 0 ? Optional.empty() : Optional.of(BigDecimal.valueOf(kgPorUnidade));
	}
}
