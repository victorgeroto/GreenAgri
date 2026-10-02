package com.greenagri.seed;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.auth.Perfil;
import com.greenagri.auth.Usuario;
import com.greenagri.auth.UsuarioRepository;
import com.greenagri.colheita.Colheita;
import com.greenagri.colheita.ColheitaRepository;
import com.greenagri.colheita.ColheitaService;
import com.greenagri.colheita.Safra;
import com.greenagri.colheita.StatusColheita;
import com.greenagri.estoque.EstoqueService;
import com.greenagri.estoque.TipoMovimentacao;
import com.greenagri.frota.StatusVeiculo;
import com.greenagri.frota.TipoVeiculo;
import com.greenagri.frota.Veiculo;
import com.greenagri.frota.VeiculoRepository;
import com.greenagri.iot.ChaveDispositivo;
import com.greenagri.iot.Dispositivo;
import com.greenagri.iot.DispositivoRepository;
import com.greenagri.iot.IotDtos.LeituraPayload;
import com.greenagri.iot.IotDtos.TelemetriaRequest;
import com.greenagri.iot.Leitura;
import com.greenagri.iot.LeituraRepository;
import com.greenagri.iot.TelemetriaService;
import com.greenagri.iot.TipoDispositivo;
import com.greenagri.produto.Categoria;
import com.greenagri.produto.Produto;
import com.greenagri.produto.ProdutoRepository;
import com.greenagri.produto.Unidade;
import com.greenagri.talhao.Talhao;
import com.greenagri.talhao.TalhaoDtos.TalhaoRequest;
import com.greenagri.talhao.TalhaoService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Carrega os dados de demonstração de {@code classpath:seed/*.json} e gera
 * um histórico de 72 h de telemetria. Só roda com {@code greenagri.seed.enabled=true}
 * e em banco vazio.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "greenagri.seed.enabled", havingValue = "true")
public class DataSeeder implements ApplicationRunner {

	private static final String RESPONSAVEL = "Carga inicial";
	private static final Duration INTERVALO_LEITURA = Duration.ofMinutes(30);
	private static final Duration HISTORICO = Duration.ofHours(72);
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	private final ObjectMapper mapper;
	private final PasswordEncoder passwordEncoder;
	private final UsuarioRepository usuarios;
	private final ProdutoRepository produtos;
	private final EstoqueService estoqueService;
	private final ColheitaRepository colheitas;
	private final ColheitaService colheitaService;
	private final TalhaoService talhaoService;
	private final VeiculoRepository veiculos;
	private final DispositivoRepository dispositivos;
	private final LeituraRepository leituras;
	private final TelemetriaService telemetriaService;

	private final Random random = new Random(42);

	record UsuarioSeed(String nome, String email, String senha, Perfil perfil) {
	}

	record ProdutoSeed(String sku, String nome, Categoria categoria, Unidade unidade, BigDecimal estoqueMinimo,
			BigDecimal saldoInicial, String localizacao, String descricao, String imagem) {
	}

	record MovimentacaoSeed(String sku, TipoMovimentacao tipo, BigDecimal quantidade, String motivo, int diasAtras) {
	}

	record ColheitaSeed(String talhao, String cultura, int diasPlantio, int diasPrevisao,
			BigDecimal producaoEstimadaKg, StatusColheita status, Integer diasColheita, BigDecimal producaoRealKg,
			String produtoSku, String observacoes) {
	}

	record VeiculoSeed(String identificacao, String modelo, TipoVeiculo tipo, int ano, BigDecimal horimetro,
			StatusVeiculo status, Integer diasManutencao, String observacoes) {
	}

	record Simulacao(Double temperaturaMedia, Double amplitude, Double umidadeAr, Double umidadeSoloInicial,
			Double umidadeSoloFinal, Double temperaturaInicial, Double temperaturaFinal, Double divergencia,
			double bateria, Integer offlineHoras) {
	}

	record DispositivoSeed(String codigo, String nome, TipoDispositivo tipo, String localizacao, Double latitude,
			Double longitude, String apiKey, String firmware, String produtoSku, BigDecimal capacidadeKg,
			String veiculo, Simulacao simulacao) {
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) throws IOException {
		if (usuarios.count() > 0) {
			log.info("Banco já possui dados; carga de demonstração ignorada");
			return;
		}
		ler("usuarios", new TypeReference<List<UsuarioSeed>>() { })
			.forEach(u -> usuarios.save(new Usuario(u.nome(), u.email(), passwordEncoder.encode(u.senha()), u.perfil())));

		Map<String, Produto> porSku = carregarProdutos();
		carregarMovimentacoes(porSku);
		Map<String, Talhao> porCodigo = carregarTalhoes();
		carregarColheitas(porSku, porCodigo);
		Map<String, Veiculo> porIdentificacao = carregarVeiculos();
		carregarDispositivos(porSku, porIdentificacao);
		log.info("Dados de demonstração carregados: {} produtos, {} talhões, {} dispositivos", porSku.size(),
				porCodigo.size(), dispositivos.count());
	}

	private Map<String, Produto> carregarProdutos() throws IOException {
		Map<String, Produto> porSku = new HashMap<>();
		Instant inicio = Instant.now().minus(Duration.ofDays(60));
		for (ProdutoSeed s : ler("produtos", new TypeReference<List<ProdutoSeed>>() { })) {
			Produto p = new Produto();
			p.setSku(s.sku());
			p.setNome(s.nome());
			p.setCategoria(s.categoria());
			p.setUnidade(s.unidade());
			p.setEstoqueMinimo(s.estoqueMinimo());
			p.setLocalizacao(s.localizacao());
			p.setDescricao(s.descricao());
			p.setImagem(s.imagem());
			produtos.save(p);
			estoqueService.registrar(p.getId(), TipoMovimentacao.ENTRADA, s.saldoInicial(), "Saldo inicial",
					RESPONSAVEL, null, inicio);
			porSku.put(s.sku(), p);
		}
		return porSku;
	}

	private void carregarMovimentacoes(Map<String, Produto> porSku) throws IOException {
		for (MovimentacaoSeed s : ler("movimentacoes", new TypeReference<List<MovimentacaoSeed>>() { })) {
			Instant quando = Instant.now().minus(Duration.ofDays(s.diasAtras())).minus(Duration.ofHours(random.nextInt(8)));
			estoqueService.registrar(porSku.get(s.sku()).getId(), s.tipo(), s.quantidade(), s.motivo(), RESPONSAVEL,
					null, quando);
		}
	}

	private Map<String, Talhao> carregarTalhoes() throws IOException {
		Map<String, Talhao> porCodigo = new HashMap<>();
		for (TalhaoRequest s : ler("talhoes", new TypeReference<List<TalhaoRequest>>() { })) {
			Talhao t = talhaoService.criar(s);
			porCodigo.put(t.getCodigo(), t);
		}
		return porCodigo;
	}

	/** Cria as colheitas e reconstrói o histórico de status com datas coerentes com o ciclo. */
	private void carregarColheitas(Map<String, Produto> porSku, Map<String, Talhao> porCodigo) throws IOException {
		LocalDate hoje = LocalDate.now();
		for (ColheitaSeed s : ler("colheitas", new TypeReference<List<ColheitaSeed>>() { })) {
			Talhao talhao = porCodigo.get(s.talhao());
			Colheita c = new Colheita();
			c.setTalhao(talhao);
			c.setCultura(s.cultura());
			c.setAreaHa(talhao.getAreaHa());
			c.setDataPlantio(hoje.plusDays(s.diasPlantio()));
			c.setSafra(Safra.de(c.getDataPlantio()));
			c.setPrevisaoColheita(hoje.plusDays(s.diasPrevisao()));
			c.setDataColheita(s.diasColheita() == null ? null : hoje.plusDays(s.diasColheita()));
			c.setProducaoEstimadaKg(s.producaoEstimadaKg());
			c.setProducaoRealKg(s.producaoRealKg());
			c.setProduto(s.produtoSku() == null ? null : porSku.get(s.produtoSku()));
			c.setObservacoes(s.observacoes());
			colheitas.save(c);

			colheitaService.importarStatus(c, null, StatusColheita.PLANEJADA, RESPONSAVEL,
					manha(c.getDataPlantio().minusDays(25)));
			if (s.status().ordinal() >= StatusColheita.EM_DESENVOLVIMENTO.ordinal()) {
				colheitaService.importarStatus(c, StatusColheita.PLANEJADA, StatusColheita.EM_DESENVOLVIMENTO,
						RESPONSAVEL, manha(c.getDataPlantio()));
			}
			if (s.status() == StatusColheita.CONCLUIDA) {
				colheitaService.importarStatus(c, StatusColheita.EM_DESENVOLVIMENTO, StatusColheita.EM_COLHEITA,
						RESPONSAVEL, manha(c.getDataColheita().minusDays(3)));
				colheitaService.importarStatus(c, StatusColheita.EM_COLHEITA, StatusColheita.CONCLUIDA, RESPONSAVEL,
						manha(c.getDataColheita()).plus(Duration.ofHours(9)));
			}
		}
	}

	private static Instant manha(LocalDate data) {
		return data.atTime(8, 0).atZone(FUSO).toInstant();
	}

	private Map<String, Veiculo> carregarVeiculos() throws IOException {
		Map<String, Veiculo> porIdentificacao = new HashMap<>();
		LocalDate hoje = LocalDate.now();
		for (VeiculoSeed s : ler("veiculos", new TypeReference<List<VeiculoSeed>>() { })) {
			Veiculo v = new Veiculo();
			v.setIdentificacao(s.identificacao());
			v.setModelo(s.modelo());
			v.setTipo(s.tipo());
			v.setAno(s.ano());
			v.setHorimetro(s.horimetro());
			v.setStatus(s.status());
			v.setProximaManutencao(s.diasManutencao() == null ? null : hoje.plusDays(s.diasManutencao()));
			v.setObservacoes(s.observacoes());
			veiculos.save(v);
			porIdentificacao.put(v.getIdentificacao(), v);
		}
		return porIdentificacao;
	}

	private void carregarDispositivos(Map<String, Produto> porSku, Map<String, Veiculo> porIdentificacao)
			throws IOException {
		Instant agora = Instant.now();
		for (DispositivoSeed s : ler("dispositivos", new TypeReference<List<DispositivoSeed>>() { })) {
			Dispositivo d = new Dispositivo();
			d.setCodigo(s.codigo());
			d.setNome(s.nome());
			d.setTipo(s.tipo());
			d.setLocalizacao(s.localizacao());
			d.setLatitude(s.latitude());
			d.setLongitude(s.longitude());
			d.setApiKeyHash(ChaveDispositivo.hash(s.apiKey()));
			d.setFirmwareVersao(s.firmware());
			d.setProduto(s.produtoSku() == null ? null : porSku.get(s.produtoSku()));
			d.setCapacidadeKg(s.capacidadeKg());
			d.setVeiculo(s.veiculo() == null ? null : porIdentificacao.get(s.veiculo()));
			dispositivos.save(d);

			Simulacao sim = s.simulacao();
			Instant fim = sim.offlineHoras() == null ? agora : agora.minus(Duration.ofHours(sim.offlineHoras()));
			Instant inicio = agora.minus(HISTORICO);
			long total = Duration.between(inicio, fim).dividedBy(INTERVALO_LEITURA);

			List<Leitura> historico = new ArrayList<>();
			for (long i = 0; i < total; i++) {
				Instant t = inicio.plus(INTERVALO_LEITURA.multipliedBy(i));
				historico.add(paraLeitura(d, simular(d, sim, (double) i / total, t), t));
			}
			leituras.saveAll(historico);

			if (sim.offlineHoras() == null) {
				// A leitura atual passa pelo fluxo real de ingestão, disparando as regras de alerta.
				telemetriaService.receber(
						new TelemetriaRequest(s.codigo(), s.firmware(), List.of(simular(d, sim, 1, agora))),
						s.apiKey());
			}
			else {
				d.setUltimoContato(fim);
				d.setBateria(sim.bateria());
			}
		}
	}

	/** Gera uma leitura plausível: ciclo dia/noite + tendência linear + ruído. */
	private LeituraPayload simular(Dispositivo d, Simulacao sim, double progresso, Instant t) {
		double hora = t.atZone(FUSO).getHour() + t.atZone(FUSO).getMinute() / 60.0;
		double ciclo = Math.sin(2 * Math.PI * (hora - 9) / 24); // pico às 15h
		double bateria = arredondar(sim.bateria() + 3 * (1 - progresso));
		int rssi = -60 - random.nextInt(35);
		Long ts = t.getEpochSecond();
		return switch (d.getTipo()) {
			case ESTACAO_METEOROLOGICA -> {
				double temp = sim.temperaturaMedia() + sim.amplitude() * ciclo + ruido(0.6);
				double ur = Math.clamp(sim.umidadeAr() - 2.5 * (temp - sim.temperaturaMedia()) + ruido(2), 15, 100);
				yield new LeituraPayload(ts, arredondar(temp), arredondar(ur), null, null, bateria, rssi, null, null,
						null, null);
			}
			case SENSOR_SOLO -> {
				double solo = interpolar(sim.umidadeSoloInicial(), sim.umidadeSoloFinal(), progresso) + ruido(0.4);
				double temp = 21 + 3 * ciclo + ruido(0.3);
				yield new LeituraPayload(ts, arredondar(temp), null, arredondar(solo), null, bateria, rssi, null, null,
						null, null);
			}
			case SENSOR_SILO -> {
				double temp = interpolar(sim.temperaturaInicial(), sim.temperaturaFinal(), progresso * progresso)
						+ ruido(0.15);
				yield new LeituraPayload(ts, arredondar(temp), null, null, arredondar(nivelSilo(d, sim) + ruido(0.2)),
						bateria, rssi, null, null, null, null);
			}
			// Máquina estacionada no galpão: posição com o ruído típico de um GNSS comum (~2 m).
			case RASTREADOR_MAQUINA -> new LeituraPayload(ts, null, null, null, null, bateria, rssi,
					d.getLatitude() + ruido(0.00002), d.getLongitude() + ruido(0.00002), 0.0, false);
		};
	}

	/** Nível coerente com o saldo registrado, aplicando a divergência simulada (perda/furto/lançamento esquecido). */
	private static double nivelSilo(Dispositivo d, Simulacao sim) {
		Produto p = d.getProduto();
		double kg = p.getQuantidadeAtual().doubleValue() * p.getUnidade().kgPorUnidade().orElseThrow().doubleValue();
		return arredondar(kg * (1 + sim.divergencia()) / d.getCapacidadeKg().doubleValue() * 100);
	}

	private static Leitura paraLeitura(Dispositivo d, LeituraPayload p, Instant t) {
		Leitura l = new Leitura();
		l.setDispositivo(d);
		l.setMedidoEm(t);
		l.setRecebidoEm(t);
		l.setTemperatura(p.temperatura());
		l.setUmidadeAr(p.umidadeAr());
		l.setUmidadeSolo(p.umidadeSolo());
		l.setNivelPercentual(p.nivelPercentual());
		l.setBateria(p.bateria());
		l.setRssi(p.rssi());
		l.setLatitude(p.lat());
		l.setLongitude(p.lon());
		l.setVelocidade(p.velocidade());
		l.setOperando(p.operando());
		return l;
	}

	private <T> List<T> ler(String nome, TypeReference<List<T>> tipo) throws IOException {
		try (InputStream in = new ClassPathResource("seed/" + nome + ".json").getInputStream()) {
			return mapper.readValue(in, tipo);
		}
	}

	private double ruido(double amplitude) {
		return (random.nextDouble() * 2 - 1) * amplitude;
	}

	private static double interpolar(double a, double b, double t) {
		return a + (b - a) * t;
	}

	private static double arredondar(double v) {
		return Math.round(v * 10) / 10.0;
	}
}
