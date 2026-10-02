package com.greenagri.iot;

import java.util.ArrayList;
import java.util.List;

import com.greenagri.iot.Alerta.Severidade;
import com.greenagri.iot.Alerta.Tipo;

/**
 * Regras agronômicas avaliadas sobre a leitura mais recente de cada lote.
 * Sem estado e sem dependências, para ser testável isoladamente — e portável
 * para o firmware caso se queira decidir na borda (edge) sem conectividade.
 */
public final class RegrasAlerta {

	static final double SOLO_SECO_AVISO = 25;
	static final double SOLO_SECO_CRITICO = 15;
	static final double GEADA = 3;
	static final double CALOR_EXTREMO = 38;
	static final double SILO_AQUECIMENTO = 30;
	static final double SILO_NIVEL_BAIXO = 15;
	static final double BATERIA_BAIXA = 20;

	public record Disparo(Tipo tipo, Severidade severidade, String mensagem, double valor) {
	}

	private RegrasAlerta() {
	}

	public static List<Disparo> avaliar(TipoDispositivo tipo, Leitura l) {
		List<Disparo> disparos = new ArrayList<>();
		switch (tipo) {
			case SENSOR_SOLO -> {
				if (l.getUmidadeSolo() != null && l.getUmidadeSolo() < SOLO_SECO_AVISO) {
					boolean critico = l.getUmidadeSolo() < SOLO_SECO_CRITICO;
					disparos.add(new Disparo(Tipo.SOLO_SECO, critico ? Severidade.CRITICO : Severidade.AVISO,
							"Umidade do solo em %.0f%% — avaliar irrigação".formatted(l.getUmidadeSolo()),
							l.getUmidadeSolo()));
				}
			}
			case ESTACAO_METEOROLOGICA -> {
				if (l.getTemperatura() != null && l.getTemperatura() <= GEADA) {
					disparos.add(new Disparo(Tipo.GEADA, Severidade.CRITICO,
							"Temperatura de %.1f °C — risco de geada".formatted(l.getTemperatura()),
							l.getTemperatura()));
				}
				else if (l.getTemperatura() != null && l.getTemperatura() >= CALOR_EXTREMO) {
					disparos.add(new Disparo(Tipo.CALOR_EXTREMO, Severidade.AVISO,
							"Temperatura de %.1f °C — estresse térmico nas culturas".formatted(l.getTemperatura()),
							l.getTemperatura()));
				}
			}
			case SENSOR_SILO -> {
				if (l.getTemperatura() != null && l.getTemperatura() >= SILO_AQUECIMENTO) {
					disparos.add(new Disparo(Tipo.SILO_AQUECIMENTO, Severidade.CRITICO,
							"Massa de grãos a %.1f °C — risco de fermentação, acionar aeração"
								.formatted(l.getTemperatura()),
							l.getTemperatura()));
				}
				if (l.getNivelPercentual() != null && l.getNivelPercentual() <= SILO_NIVEL_BAIXO) {
					disparos.add(new Disparo(Tipo.SILO_NIVEL_BAIXO, Severidade.AVISO,
							"Silo com %.0f%% da capacidade".formatted(l.getNivelPercentual()),
							l.getNivelPercentual()));
				}
			}
		}
		if (l.getBateria() != null && l.getBateria() <= BATERIA_BAIXA) {
			disparos.add(new Disparo(Tipo.BATERIA_BAIXA, Severidade.INFO,
					"Bateria em %.0f%%".formatted(l.getBateria()), l.getBateria()));
		}
		return disparos;
	}
}
