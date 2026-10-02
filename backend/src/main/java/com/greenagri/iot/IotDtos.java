package com.greenagri.iot;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class IotDtos {

	private IotDtos() {
	}

	/**
	 * Lote enviado pelo firmware. As chaves curtas reduzem o payload em links
	 * de baixa banda (LoRa/2G); o lote permite reenviar as leituras guardadas
	 * enquanto o dispositivo ficou sem sinal (store-and-forward).
	 */
	public record TelemetriaRequest(
			@NotBlank String codigo,
			String firmware,
			@NotEmpty @Size(max = 500) List<@Valid @NotNull LeituraPayload> leituras) {
	}

	public record LeituraPayload(
			/** Epoch em segundos do RTC/NTP do dispositivo; ausente = horário de recebimento. */
			Long ts,
			@JsonProperty("t") Double temperatura,
			@JsonProperty("ur") Double umidadeAr,
			@JsonProperty("us") Double umidadeSolo,
			@JsonProperty("nivel") Double nivelPercentual,
			@JsonProperty("bat") Double bateria,
			Integer rssi) {
	}

	public record TelemetriaResponse(int aceitas, int duplicadas, int alertasGerados) {
	}

	public record LeituraResponse(Instant medidoEm, Double temperatura, Double umidadeAr, Double umidadeSolo,
			Double nivelPercentual, Double bateria, Integer rssi) {

		public static LeituraResponse de(Leitura l) {
			return new LeituraResponse(l.getMedidoEm(), l.getTemperatura(), l.getUmidadeAr(), l.getUmidadeSolo(),
					l.getNivelPercentual(), l.getBateria(), l.getRssi());
		}
	}

	/** Comparação entre o grão medido pelo sensor de nível e o saldo registrado no estoque. */
	public record ReconciliacaoSilo(Long produtoId, String produtoNome, BigDecimal capacidadeKg,
			BigDecimal medidoKg, BigDecimal registradoKg, BigDecimal divergenciaPercentual, boolean divergente) {
	}

	public record DispositivoResponse(Long id, String codigo, String nome, TipoDispositivo tipo, String localizacao,
			Double latitude, Double longitude, String firmwareVersao, Instant ultimoContato, boolean online,
			Double bateria, LeituraResponse ultimaLeitura, ReconciliacaoSilo silo) {
	}

	public record DispositivoRequest(
			@NotBlank @Size(max = 40) String codigo,
			@NotBlank @Size(max = 120) String nome,
			@NotNull TipoDispositivo tipo,
			@Size(max = 120) String localizacao,
			Double latitude,
			Double longitude,
			Long produtoId,
			BigDecimal capacidadeKg) {
	}

	/** Devolvido uma única vez no provisionamento: a chave não é armazenada em texto. */
	public record ProvisionamentoResponse(DispositivoResponse dispositivo, String apiKey) {
	}

	public record AlertaResponse(Long id, Long dispositivoId, String dispositivoNome, Alerta.Tipo tipo,
			Alerta.Severidade severidade, String mensagem, Double valor, Instant criadoEm, boolean reconhecido) {

		public static AlertaResponse de(Alerta a) {
			return new AlertaResponse(a.getId(), a.getDispositivo().getId(), a.getDispositivo().getNome(), a.getTipo(),
					a.getSeveridade(), a.getMensagem(), a.getValor(), a.getCriadoEm(), a.isReconhecido());
		}
	}
}
