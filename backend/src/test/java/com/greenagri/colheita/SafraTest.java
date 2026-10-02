package com.greenagri.colheita;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class SafraTest {

	@Test
	void anoSafraVaiDeJulhoAJunho() {
		assertThat(Safra.de(LocalDate.of(2025, 9, 15))).isEqualTo("2025/26"); // soja de verão
		assertThat(Safra.de(LocalDate.of(2026, 2, 10))).isEqualTo("2025/26"); // milho safrinha
		assertThat(Safra.de(LocalDate.of(2026, 7, 1))).isEqualTo("2026/27");
		assertThat(Safra.de(LocalDate.of(2099, 8, 1))).isEqualTo("2099/00");
	}
}
