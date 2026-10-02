package com.greenagri.estoque;

public enum TipoMovimentacao {
	/** Soma a quantidade ao saldo. */
	ENTRADA,
	/** Subtrai a quantidade do saldo; não pode deixá-lo negativo. */
	SAIDA,
	/** Inventário: a quantidade informada passa a ser o saldo. */
	AJUSTE
}
