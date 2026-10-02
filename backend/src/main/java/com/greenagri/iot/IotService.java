package com.greenagri.iot;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.config.GreenAgriProperties;
import com.greenagri.iot.IotDtos.AlertaResponse;
import com.greenagri.iot.IotDtos.DispositivoRequest;
import com.greenagri.iot.IotDtos.DispositivoResponse;
import com.greenagri.iot.IotDtos.LeituraResponse;
import com.greenagri.iot.IotDtos.ProvisionamentoResponse;
import com.greenagri.iot.IotDtos.ReconciliacaoSilo;
import com.greenagri.produto.Produto;
import com.greenagri.produto.ProdutoRepository;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class IotService {

	/** Diferença entre medido e registrado acima da qual o silo é sinalizado. */
	private static final BigDecimal LIMITE_DIVERGENCIA = BigDecimal.TEN;

	private final DispositivoRepository dispositivos;
	private final LeituraRepository leituras;
	private final AlertaRepository alertas;
	private final ProdutoRepository produtos;
	private final GreenAgriProperties props;

	@Transactional(readOnly = true)
	public List<DispositivoResponse> listarDispositivos() {
		return dispositivos.findAllByOrderByCodigoAsc().stream().map(this::paraResponse).toList();
	}

	@Transactional(readOnly = true)
	public List<LeituraResponse> leituras(Long dispositivoId, int horas) {
		if (!dispositivos.existsById(dispositivoId)) {
			throw new RecursoNaoEncontradoException("Dispositivo", dispositivoId);
		}
		Instant desde = Instant.now().minus(Duration.ofHours(Math.clamp(horas, 1, 24 * 30)));
		return leituras.findByDispositivoIdAndMedidoEmAfterOrderByMedidoEmAsc(dispositivoId, desde).stream()
			.map(LeituraResponse::de)
			.toList();
	}

	@Transactional
	public ProvisionamentoResponse provisionar(DispositivoRequest req) {
		if (dispositivos.existsByCodigoIgnoreCase(req.codigo())) {
			throw new RegraNegocioException("Já existe um dispositivo com o código " + req.codigo());
		}
		String apiKey = ChaveDispositivo.gerar();
		Dispositivo d = new Dispositivo();
		d.setCodigo(req.codigo().trim().toUpperCase());
		d.setNome(req.nome());
		d.setTipo(req.tipo());
		d.setLocalizacao(req.localizacao());
		d.setLatitude(req.latitude());
		d.setLongitude(req.longitude());
		d.setCapacidadeKg(req.capacidadeKg());
		d.setApiKeyHash(ChaveDispositivo.hash(apiKey));
		if (req.produtoId() != null) {
			d.setProduto(produtos.findById(req.produtoId())
				.orElseThrow(() -> new RecursoNaoEncontradoException("Produto", req.produtoId())));
		}
		return new ProvisionamentoResponse(paraResponse(dispositivos.save(d)), apiKey);
	}

	@Transactional(readOnly = true)
	public List<AlertaResponse> alertas(boolean reconhecidos) {
		return alertas.findTop100ByReconhecidoOrderByCriadoEmDesc(reconhecidos).stream()
			.map(AlertaResponse::de)
			.toList();
	}

	@Transactional
	public AlertaResponse reconhecer(Long alertaId) {
		Alerta alerta = alertas.findById(alertaId)
			.orElseThrow(() -> new RecursoNaoEncontradoException("Alerta", alertaId));
		alerta.setReconhecido(true);
		return AlertaResponse.de(alerta);
	}

	private DispositivoResponse paraResponse(Dispositivo d) {
		LeituraResponse ultima = leituras.findFirstByDispositivoIdOrderByMedidoEmDesc(d.getId())
			.map(LeituraResponse::de)
			.orElse(null);
		Instant limiteOnline = Instant.now().minus(Duration.ofMinutes(props.iot().minutosOffline()));
		boolean online = d.getUltimoContato() != null && d.getUltimoContato().isAfter(limiteOnline);
		return new DispositivoResponse(d.getId(), d.getCodigo(), d.getNome(), d.getTipo(), d.getLocalizacao(),
				d.getLatitude(), d.getLongitude(), d.getFirmwareVersao(), d.getUltimoContato(), online,
				d.getBateria(), ultima, reconciliar(d, ultima));
	}

	/**
	 * Converte o nível percentual do sensor em kg e compara com o saldo do
	 * produto armazenado — aponta perdas, furtos ou lançamentos esquecidos.
	 */
	static ReconciliacaoSilo reconciliar(Dispositivo d, LeituraResponse ultima) {
		Produto produto = d.getProduto();
		if (d.getTipo() != TipoDispositivo.SENSOR_SILO || produto == null || d.getCapacidadeKg() == null
				|| ultima == null || ultima.nivelPercentual() == null) {
			return null;
		}
		BigDecimal fator = produto.getUnidade().kgPorUnidade().orElse(null);
		if (fator == null) {
			return null;
		}
		BigDecimal medido = d.getCapacidadeKg()
			.multiply(BigDecimal.valueOf(ultima.nivelPercentual()))
			.divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
		BigDecimal registrado = produto.getQuantidadeAtual().multiply(fator).setScale(0, RoundingMode.HALF_UP);
		BigDecimal divergencia = registrado.signum() == 0 ? null
				: medido.subtract(registrado)
					.multiply(BigDecimal.valueOf(100))
					.divide(registrado, 1, RoundingMode.HALF_UP);
		boolean divergente = divergencia != null && divergencia.abs().compareTo(LIMITE_DIVERGENCIA) > 0;
		return new ReconciliacaoSilo(produto.getId(), produto.getNome(), d.getCapacidadeKg(), medido, registrado,
				divergencia, divergente);
	}
}
