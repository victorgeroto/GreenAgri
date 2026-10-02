package com.greenagri.talhao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.greenagri.shared.RegraNegocioException;

class PoligonoTest {

	// Quadrado de ~1 km x 1 km próximo a Cascavel-PR (lat -24.95)
	private static final double LAT = -24.95;
	private static final double LON = -53.45;
	private static final double DLAT = 1.0 / 110.574;
	private static final double DLON = 1.0 / (111.320 * Math.cos(Math.toRadians(LAT)));

	private static Poligono quadrado() {
		return new Poligono("Polygon", List.of(List.of(
				List.of(LON, LAT), List.of(LON + DLON, LAT), List.of(LON + DLON, LAT + DLAT), List.of(LON, LAT + DLAT),
				List.of(LON, LAT))));
	}

	@Test
	void calculaAreaEmHectares() {
		assertThat(quadrado().areaHectares()).isCloseTo(100.0, within(0.5));
	}

	@Test
	void centroideFicaNoMeio() {
		Poligono.Ponto c = quadrado().centroide();
		assertThat(c.lat()).isCloseTo(LAT + DLAT / 2, within(1e-6));
		assertThat(c.lon()).isCloseTo(LON + DLON / 2, within(1e-6));
	}

	@Test
	void identificaPontoDentroEFora() {
		Poligono p = quadrado();
		assertThat(p.contem(LAT + DLAT / 2, LON + DLON / 2)).isTrue();
		assertThat(p.contem(LAT - DLAT, LON)).isFalse();
		assertThat(p.contem(LAT + DLAT / 2, LON + 2 * DLON)).isFalse();
	}

	@Test
	void fechaOAnelAutomaticamente() {
		Poligono aberto = new Poligono("Polygon",
				List.of(List.of(List.of(LON, LAT), List.of(LON + DLON, LAT), List.of(LON + DLON, LAT + DLAT))));
		assertThat(aberto.anel()).hasSize(4);
		assertThat(aberto.areaHectares()).isCloseTo(50.0, within(0.5));
	}

	@Test
	void recusaGeometriaInvalida() {
		assertThatThrownBy(() -> new Poligono("Point", List.of()).anel()).isInstanceOf(RegraNegocioException.class);
		assertThatThrownBy(() -> new Poligono("Polygon", List.of(List.of(List.of(LON, LAT), List.of(LON, 95.0)))).anel())
			.isInstanceOf(RegraNegocioException.class);
	}
}
