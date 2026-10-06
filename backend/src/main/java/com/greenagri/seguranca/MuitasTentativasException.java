package com.greenagri.seguranca;

import java.time.Duration;

/** Respondida como HTTP 429 com Retry-After. */
public class MuitasTentativasException extends RuntimeException {

	private final Duration aguardar;

	public MuitasTentativasException(Duration aguardar) {
		super("Muitas tentativas. Tente novamente em %d minuto(s).".formatted(Math.max(1, (aguardar.toSeconds() + 59) / 60)));
		this.aguardar = aguardar;
	}

	public long segundos() {
		return Math.max(1, aguardar.toSeconds());
	}
}
