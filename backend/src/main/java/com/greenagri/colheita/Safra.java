package com.greenagri.colheita;

import java.time.LocalDate;

/** Ano-safra brasileiro (julho a junho): plantio em ago/2025 pertence à safra "2025/26". */
public final class Safra {

	public static final String PADRAO = "^\\d{4}/\\d{2}$";

	private Safra() {
	}

	public static String de(LocalDate plantio) {
		int inicio = plantio.getMonthValue() >= 7 ? plantio.getYear() : plantio.getYear() - 1;
		return "%d/%02d".formatted(inicio, (inicio + 1) % 100);
	}
}
