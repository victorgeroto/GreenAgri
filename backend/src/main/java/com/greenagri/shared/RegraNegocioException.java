package com.greenagri.shared;

/** Violação de regra de domínio (ex.: saída maior que o saldo em estoque). */
public class RegraNegocioException extends RuntimeException {

	public RegraNegocioException(String mensagem) {
		super(mensagem);
	}
}
