package com.greenagri.colheita;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.colheita.ColheitaDtos.ColheitaRequest;
import com.greenagri.colheita.ColheitaDtos.ConclusaoRequest;
import com.greenagri.colheita.ColheitaEvento.Origem;
import com.greenagri.estoque.EstoqueService;
import com.greenagri.estoque.TipoMovimentacao;
import com.greenagri.produto.Produto;
import com.greenagri.produto.ProdutoRepository;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;
import com.greenagri.talhao.Talhao;
import com.greenagri.talhao.TalhaoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ColheitaService {

	private static final EnumSet<StatusColheita> OCUPANDO = EnumSet.of(StatusColheita.EM_DESENVOLVIMENTO,
			StatusColheita.EM_COLHEITA);

	private final ColheitaRepository colheitas;
	private final ColheitaEventoRepository eventos;
	private final TalhaoRepository talhoes;
	private final ProdutoRepository produtos;
	private final EstoqueService estoqueService;

	@Transactional(readOnly = true)
	public List<Colheita> listar(String safra) {
		return safra == null || safra.isBlank() ? colheitas.findAllByOrderByPrevisaoColheitaAsc()
				: colheitas.findBySafraOrderByPrevisaoColheitaAsc(safra);
	}

	@Transactional(readOnly = true)
	public List<String> safras() {
		return colheitas.safras();
	}

	@Transactional(readOnly = true)
	public Colheita obter(Long id) {
		return colheitas.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Colheita", id));
	}

	@Transactional(readOnly = true)
	public List<ColheitaEvento> eventos(Long id) {
		obter(id);
		return eventos.findByColheitaIdOrderByOcorridoEmAscIdAsc(id);
	}

	@Transactional
	public Colheita criar(ColheitaRequest req, String responsavel) {
		StatusColheita inicial = req.status() == null ? StatusColheita.PLANEJADA : req.status();
		if (inicial != StatusColheita.PLANEJADA && inicial != StatusColheita.EM_DESENVOLVIMENTO) {
			throw new RegraNegocioException("Uma colheita nova começa como planejada ou em desenvolvimento");
		}
		Colheita colheita = new Colheita();
		aplicar(colheita, req);
		colheitas.save(colheita);
		if (inicial.ocupaTalhao()) {
			garantirTalhaoLivre(colheita);
		}
		gravarEvento(colheita, null, inicial, Origem.MANUAL, responsavel, "Cadastro", null, null, Instant.now());
		return colheita;
	}

	@Transactional
	public Colheita atualizar(Long id, ColheitaRequest req) {
		Colheita colheita = obter(id);
		if (colheita.getStatus() == StatusColheita.CONCLUIDA) {
			throw new RegraNegocioException("Colheitas concluídas não podem ser alteradas");
		}
		Long talhaoAnterior = colheita.getTalhao().getId();
		aplicar(colheita, req);
		if (!talhaoAnterior.equals(colheita.getTalhao().getId()) && colheita.getStatus().ocupaTalhao()) {
			garantirTalhaoLivre(colheita);
		}
		return colheita;
	}

	/** Avanço manual do ciclo (ex.: "plantio realizado", "colheita iniciada"). */
	@Transactional
	public Colheita mudarStatus(Long id, StatusColheita novo, String observacao, String responsavel) {
		Colheita colheita = obter(id);
		if (novo == StatusColheita.CONCLUIDA) {
			throw new RegraNegocioException("Para concluir, informe a produção em /concluir");
		}
		registrar(colheita, novo, Origem.MANUAL, responsavel, observacao, null, null, Instant.now());
		return colheita;
	}

	/**
	 * Chamado pelo geofence: uma colheitadeira começou a operar dentro do talhão.
	 * Se a lavoura do talhão estiver em desenvolvimento, passa para "em colheita".
	 */
	@Transactional
	public Optional<Colheita> iniciarPorMaquina(Talhao talhao, String maquina, double lat, double lon,
			Instant quando) {
		return colheitas.findByTalhaoIdAndStatusIn(talhao.getId(), EnumSet.of(StatusColheita.EM_DESENVOLVIMENTO))
			.stream()
			.findFirst()
			.map(c -> {
				registrar(c, StatusColheita.EM_COLHEITA, Origem.DISPOSITIVO, maquina,
						maquina + " começou a operar no talhão " + talhao.getCodigo(), lat, lon, quando);
				return c;
			});
	}

	/**
	 * Fecha a colheita e lança a produção como ENTRADA no produto vinculado,
	 * convertendo de kg para a unidade do produto.
	 */
	@Transactional
	public Colheita concluir(Long id, ConclusaoRequest req, String responsavel) {
		Colheita colheita = obter(id);
		colheita.setDataColheita(req.dataColheita());
		colheita.setProducaoRealKg(req.producaoRealKg());
		registrar(colheita, StatusColheita.CONCLUIDA, Origem.MANUAL, responsavel,
				"Produção de " + req.producaoRealKg().stripTrailingZeros().toPlainString() + " kg", null, null,
				Instant.now());

		Produto produto = colheita.getProduto();
		if (produto != null) {
			BigDecimal quantidade = converterDeKg(req.producaoRealKg(), produto);
			estoqueService.registrar(produto.getId(), TipoMovimentacao.ENTRADA, quantidade,
					"Colheita " + colheita.getCultura() + " - talhão " + colheita.getTalhao().getCodigo(),
					responsavel, null, null);
		}
		return colheita;
	}

	/**
	 * Registra um status histórico sem as validações de transição; usado na
	 * importação de safras passadas (carga de dados).
	 */
	@Transactional
	public void importarStatus(Colheita colheita, StatusColheita anterior, StatusColheita status, String responsavel,
			Instant quando) {
		gravarEvento(colheita, anterior, status, Origem.MANUAL, responsavel, "Importado", null, null, quando);
	}

	@Transactional
	public void excluir(Long id) {
		colheitas.delete(obter(id));
	}

	static BigDecimal converterDeKg(BigDecimal kg, Produto produto) {
		BigDecimal fator = produto.getUnidade().kgPorUnidade()
			.orElseThrow(() -> new RegraNegocioException("O produto " + produto.getNome() + " usa a unidade "
					+ produto.getUnidade() + ", incompatível com produção em kg"));
		return kg.divide(fator, 2, RoundingMode.HALF_UP);
	}

	private void registrar(Colheita c, StatusColheita novo, Origem origem, String responsavel, String observacao,
			Double lat, Double lon, Instant quando) {
		StatusColheita atual = c.getStatus();
		if (novo.ordinal() <= atual.ordinal()) {
			throw new RegraNegocioException("A colheita já está %s; o status só avança".formatted(descrever(atual)));
		}
		if (novo.ocupaTalhao()) {
			garantirTalhaoLivre(c);
		}
		gravarEvento(c, atual, novo, origem, responsavel, observacao, lat, lon, quando);
	}

	private void gravarEvento(Colheita c, StatusColheita anterior, StatusColheita novo, Origem origem,
			String responsavel, String observacao, Double lat, Double lon, Instant quando) {
		ColheitaEvento e = new ColheitaEvento();
		e.setColheita(c);
		e.setStatusAnterior(anterior);
		e.setStatusNovo(novo);
		e.setOrigem(origem);
		e.setResponsavel(responsavel);
		e.setObservacao(observacao);
		e.setLatitude(lat);
		e.setLongitude(lon);
		e.setOcorridoEm(quando);
		eventos.save(e);
		c.setStatus(novo);
		c.setStatusDesde(quando);
	}

	/** Um talhão comporta uma lavoura ativa por vez (ex.: soja precisa sair antes do milho safrinha). */
	private void garantirTalhaoLivre(Colheita c) {
		colheitas.findByTalhaoIdAndStatusIn(c.getTalhao().getId(), OCUPANDO).stream()
			.filter(outra -> !outra.getId().equals(c.getId()))
			.findFirst()
			.ifPresent(outra -> {
				throw new RegraNegocioException("O talhão %s já está ocupado por %s (%s)".formatted(
						c.getTalhao().getCodigo(), outra.getCultura(), descrever(outra.getStatus())));
			});
	}

	private static String descrever(StatusColheita s) {
		return switch (s) {
			case PLANEJADA -> "planejada";
			case EM_DESENVOLVIMENTO -> "em desenvolvimento";
			case EM_COLHEITA -> "em colheita";
			case CONCLUIDA -> "concluída";
		};
	}

	private void aplicar(Colheita c, ColheitaRequest req) {
		Talhao talhao = talhoes.findById(req.talhaoId())
			.orElseThrow(() -> new RecursoNaoEncontradoException("Talhão", req.talhaoId()));
		BigDecimal area = req.areaHa() != null ? req.areaHa() : talhao.getAreaHa();
		if (area == null) {
			throw new RegraNegocioException("Informe a área: o talhão " + talhao.getCodigo() + " ainda não foi desenhado");
		}
		c.setTalhao(talhao);
		c.setCultura(req.cultura().trim());
		c.setSafra(req.safra() != null ? req.safra() : Safra.de(req.dataPlantio()));
		c.setAreaHa(area);
		c.setDataPlantio(req.dataPlantio());
		c.setPrevisaoColheita(req.previsaoColheita());
		c.setProducaoEstimadaKg(req.producaoEstimadaKg());
		c.setObservacoes(req.observacoes());
		c.setProduto(req.produtoId() == null ? null
				: produtos.findById(req.produtoId())
					.orElseThrow(() -> new RecursoNaoEncontradoException("Produto", req.produtoId())));
	}
}
