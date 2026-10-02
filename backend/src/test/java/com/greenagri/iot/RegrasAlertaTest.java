package com.greenagri.iot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.greenagri.iot.Alerta.Severidade;
import com.greenagri.iot.Alerta.Tipo;

class RegrasAlertaTest {

	@Test
	void soloSecoGeraAvisoECriticoConformeLimite() {
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SOLO, leitura(l -> l.setUmidadeSolo(22.0))))
			.singleElement()
			.satisfies(d -> {
				assertThat(d.tipo()).isEqualTo(Tipo.SOLO_SECO);
				assertThat(d.severidade()).isEqualTo(Severidade.AVISO);
			});
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SOLO, leitura(l -> l.setUmidadeSolo(10.0))))
			.extracting(RegrasAlerta.Disparo::severidade)
			.containsExactly(Severidade.CRITICO);
	}

	@Test
	void soloUmidoNaoGeraAlerta() {
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SOLO, leitura(l -> l.setUmidadeSolo(35.0)))).isEmpty();
	}

	@Test
	void estacaoDetectaGeada() {
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.ESTACAO_METEOROLOGICA, leitura(l -> l.setTemperatura(1.5))))
			.extracting(RegrasAlerta.Disparo::tipo)
			.containsExactly(Tipo.GEADA);
	}

	@Test
	void siloAquecidoEVazioGeraDoisAlertas() {
		Leitura l = leitura(x -> {
			x.setTemperatura(32.0);
			x.setNivelPercentual(10.0);
		});
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SILO, l))
			.extracting(RegrasAlerta.Disparo::tipo)
			.containsExactlyInAnyOrder(Tipo.SILO_AQUECIMENTO, Tipo.SILO_NIVEL_BAIXO);
	}

	@Test
	void temperaturaDeSoloNaoEhConfundidaComGeada() {
		// A regra de geada vale só para estação meteorológica.
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SOLO, leitura(l -> l.setTemperatura(1.0)))).isEmpty();
	}

	@Test
	void bateriaBaixaValeParaQualquerDispositivo() {
		assertThat(RegrasAlerta.avaliar(TipoDispositivo.SENSOR_SILO, leitura(l -> l.setBateria(15.0))))
			.extracting(RegrasAlerta.Disparo::tipo)
			.containsExactly(Tipo.BATERIA_BAIXA);
	}

	private static Leitura leitura(java.util.function.Consumer<Leitura> config) {
		Leitura l = new Leitura();
		config.accept(l);
		return l;
	}
}
