package com.greenagri.iot;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.iot.IotDtos.LeituraPayload;
import com.greenagri.iot.IotDtos.TelemetriaRequest;
import com.greenagri.iot.IotDtos.TelemetriaResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TelemetriaService {

	/** Antes disso o RTC do dispositivo claramente não foi sincronizado. */
	private static final Instant RELOGIO_VALIDO_DESDE = Instant.parse("2024-01-01T00:00:00Z");
	/** Um alerta do mesmo tipo não é repetido enquanto houver outro aberto nesta janela. */
	private static final Duration JANELA_ALERTA = Duration.ofHours(6);

	private final DispositivoRepository dispositivos;
	private final LeituraRepository leituras;
	private final AlertaRepository alertas;
	private final GeofenceService geofence;

	@Transactional
	public TelemetriaResponse receber(TelemetriaRequest req, String apiKey) {
		Dispositivo dispositivo = dispositivos.findByCodigo(req.codigo())
			.filter(d -> ChaveDispositivo.confere(apiKey, d.getApiKeyHash()))
			.orElseThrow(() -> new BadCredentialsException("Dispositivo ou chave inválidos"));

		Instant agora = Instant.now();
		List<Leitura> lote = req.leituras().stream().map(p -> paraLeitura(p, dispositivo, agora)).toList();

		// Reenvios do store-and-forward: descarta instantes já gravados e repetidos no próprio lote.
		Set<Instant> vistos = new HashSet<>(
				leituras.instantesJaRecebidos(dispositivo.getId(), lote.stream().map(Leitura::getMedidoEm).toList()));
		List<Leitura> novas = lote.stream().filter(l -> vistos.add(l.getMedidoEm())).toList();
		Instant ultimaConhecida = leituras.findFirstByDispositivoIdOrderByMedidoEmDesc(dispositivo.getId())
			.map(Leitura::getMedidoEm)
			.orElse(Instant.EPOCH);
		leituras.saveAll(novas);

		dispositivo.setUltimoContato(agora);
		if (req.firmware() != null) {
			dispositivo.setFirmwareVersao(req.firmware());
		}

		int alertasGerados = 0;
		Leitura maisRecente = novas.stream().max(Comparator.comparing(Leitura::getMedidoEm)).orElse(null);
		// Lotes atrasados só completam o histórico: regras e bateria refletem o estado mais novo.
		if (maisRecente != null && maisRecente.getMedidoEm().isAfter(ultimaConhecida)) {
			if (maisRecente.getBateria() != null) {
				dispositivo.setBateria(maisRecente.getBateria());
			}
			if (maisRecente.getLatitude() != null && maisRecente.getLongitude() != null) {
				dispositivo.setLatitude(maisRecente.getLatitude());
				dispositivo.setLongitude(maisRecente.getLongitude());
			}
			alertasGerados = gerarAlertas(dispositivo, maisRecente, agora);
		}
		List<Leitura> cronologicas = novas.stream().sorted(Comparator.comparing(Leitura::getMedidoEm)).toList();
		int mudancas = geofence.processar(dispositivo, cronologicas);
		return new TelemetriaResponse(novas.size(), lote.size() - novas.size(), alertasGerados, mudancas);
	}

	private int gerarAlertas(Dispositivo dispositivo, Leitura leitura, Instant agora) {
		int gerados = 0;
		for (RegrasAlerta.Disparo d : RegrasAlerta.avaliar(dispositivo.getTipo(), leitura)) {
			boolean jaAberto = alertas.existsByDispositivoIdAndTipoAndReconhecidoFalseAndCriadoEmAfter(
					dispositivo.getId(), d.tipo(), agora.minus(JANELA_ALERTA));
			if (!jaAberto) {
				Alerta alerta = new Alerta();
				alerta.setDispositivo(dispositivo);
				alerta.setTipo(d.tipo());
				alerta.setSeveridade(d.severidade());
				alerta.setMensagem(d.mensagem());
				alerta.setValor(d.valor());
				alerta.setCriadoEm(agora);
				alertas.save(alerta);
				gerados++;
			}
		}
		return gerados;
	}

	private static Leitura paraLeitura(LeituraPayload p, Dispositivo dispositivo, Instant agora) {
		Instant medidoEm = p.ts() == null ? agora : Instant.ofEpochSecond(p.ts());
		if (medidoEm.isBefore(RELOGIO_VALIDO_DESDE) || medidoEm.isAfter(agora.plusSeconds(300))) {
			medidoEm = agora;
		}
		Leitura l = new Leitura();
		l.setDispositivo(dispositivo);
		l.setMedidoEm(medidoEm);
		l.setRecebidoEm(agora);
		l.setTemperatura(p.temperatura());
		l.setUmidadeAr(p.umidadeAr());
		l.setUmidadeSolo(p.umidadeSolo());
		l.setNivelPercentual(p.nivelPercentual());
		l.setBateria(p.bateria());
		l.setRssi(p.rssi());
		// Receptor GNSS sem fix costuma enviar 0,0: trata como posição desconhecida.
		boolean semFix = p.lat() == null || p.lon() == null || (p.lat() == 0 && p.lon() == 0);
		l.setLatitude(semFix ? null : p.lat());
		l.setLongitude(semFix ? null : p.lon());
		l.setVelocidade(p.velocidade());
		l.setOperando(p.operando());
		return l;
	}
}
