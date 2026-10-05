package com.greenagri.equipe;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.equipe.EquipeDtos.AlocacaoRequest;
import com.greenagri.equipe.EquipeDtos.AlocacaoResponse;
import com.greenagri.equipe.EquipeDtos.OperadorRequest;
import com.greenagri.equipe.EquipeDtos.OperadorResponse;
import com.greenagri.frota.StatusVeiculo;
import com.greenagri.frota.TipoVeiculo;
import com.greenagri.frota.Veiculo;
import com.greenagri.frota.VeiculoRepository;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;
import com.greenagri.talhao.Talhao;
import com.greenagri.talhao.TalhaoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EquipeService {

	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
	private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM");

	private final OperadorRepository operadores;
	private final AlocacaoRepository alocacoes;
	private final VeiculoRepository veiculos;
	private final TalhaoRepository talhoes;

	@Transactional(readOnly = true)
	public List<OperadorResponse> listar() {
		Map<Long, Alocacao> atuais = alocacoes.findByEncerradaEmIsNullOrderByInicioAsc().stream()
			.collect(Collectors.toMap(a -> a.getOperador().getId(), Function.identity(), (a, b) -> a));
		LocalDate hoje = LocalDate.now(FUSO);
		return operadores.findByAtivoTrueOrderByNomeAsc().stream().map(o -> {
			Alocacao atual = atuais.get(o.getId());
			Situacao situacao = atual != null ? Situacao.EM_ATIVIDADE
					: o.ausenteEm(hoje) ? Situacao.AUSENTE : Situacao.DISPONIVEL;
			return new OperadorResponse(o.getId(), o.getMatricula(), o.getNome(), o.getFuncao(), o.getTurno(),
					o.getCnhCategoria(), o.getHabilitacoes().stream().sorted().toList(), situacao,
					situacao == Situacao.AUSENTE ? o.getAusenteAte() : null,
					situacao == Situacao.AUSENTE ? o.getMotivoAusencia() : null,
					atual == null ? null : AlocacaoResponse.de(atual));
		}).toList();
	}

	/** Cadastra um operador na fazenda selecionada (matrícula única por fazenda). */
	@Transactional
	public OperadorResponse criarOperador(OperadorRequest req) {
		String matricula = req.matricula().trim().toUpperCase();
		if (operadores.existsByMatriculaIgnoreCase(matricula)) {
			throw new RegraNegocioException("Já existe um operador com a matrícula " + matricula);
		}
		Operador o = new Operador();
		o.setMatricula(matricula);
		o.setNome(req.nome().trim());
		o.setFuncao(req.funcao());
		o.setTurno(req.turno());
		o.setCnhCategoria(req.cnhCategoria() == null || req.cnhCategoria().isBlank() ? null : req.cnhCategoria().trim().toUpperCase());
		o.setHabilitacoes(req.habilitacoes() == null || req.habilitacoes().isEmpty() ? EnumSet.noneOf(TipoVeiculo.class)
				: EnumSet.copyOf(req.habilitacoes()));
		operadores.save(o);
		return new OperadorResponse(o.getId(), o.getMatricula(), o.getNome(), o.getFuncao(), o.getTurno(),
				o.getCnhCategoria(), o.getHabilitacoes().stream().sorted().toList(), Situacao.DISPONIVEL, null, null, null);
	}

	@Transactional(readOnly = true)
	public List<AlocacaoResponse> emAndamento() {
		return alocacoes.findByEncerradaEmIsNullOrderByInicioAsc().stream().map(AlocacaoResponse::de).toList();
	}

	@Transactional(readOnly = true)
	public List<AlocacaoResponse> historico(Long operadorId) {
		operadores.findById(operadorId).orElseThrow(() -> new RecursoNaoEncontradoException("Operador", operadorId));
		return alocacoes.findTop30ByOperadorIdOrderByInicioDesc(operadorId).stream().map(AlocacaoResponse::de).toList();
	}

	/** Devolve o DTO montado dentro da transação (as associações são carregadas sob demanda). */
	@Transactional
	public AlocacaoResponse alocar(AlocacaoRequest req, String responsavel) {
		return AlocacaoResponse.de(criarAlocacao(req, responsavel));
	}

	@Transactional
	public Alocacao criarAlocacao(AlocacaoRequest req, String responsavel) {
		if (req.idCliente() != null) {
			var existente = alocacoes.findByIdCliente(req.idCliente());
			if (existente.isPresent()) {
				return existente.get(); // reenvio da fila offline
			}
		}
		// Ordem fixa de bloqueio (operador, depois máquina) evita deadlock entre alocações simultâneas.
		Operador operador = operadores.findComBloqueioById(req.operadorId())
			.filter(Operador::isAtivo)
			.orElseThrow(() -> new RecursoNaoEncontradoException("Operador", req.operadorId()));

		LocalDate hoje = LocalDate.now(FUSO);
		if (operador.ausenteEm(hoje)) {
			throw new RegraNegocioException("%s está ausente até %s (%s)".formatted(operador.getNome(),
					operador.getAusenteAte().format(DIA), operador.getMotivoAusencia()));
		}
		alocacoes.findFirstByOperadorIdAndEncerradaEmIsNull(operador.getId()).ifPresent(a -> {
			throw new RegraNegocioException("%s já está em uma atividade de %s; encerre-a antes"
				.formatted(operador.getNome(), descrever(a.getAtividade())));
		});
		if (req.veiculoId() == null && req.talhaoId() == null) {
			throw new RegraNegocioException("Informe a máquina ou o talhão da atividade");
		}
		if (req.previsaoFim() != null && !req.previsaoFim().isAfter(Instant.now())) {
			throw new RegraNegocioException("A previsão de término deve ser no futuro");
		}

		Veiculo veiculo = req.veiculoId() == null ? null : validarMaquina(req, operador);
		Talhao talhao = req.talhaoId() == null ? null
				: talhoes.findById(req.talhaoId())
					.orElseThrow(() -> new RecursoNaoEncontradoException("Talhão", req.talhaoId()));

		if (veiculo != null) {
			if (req.atividade() == TipoAtividade.MANUTENCAO) {
				veiculo.setStatus(StatusVeiculo.MANUTENCAO);
			}
			else if (veiculo.getStatus() == StatusVeiculo.DISPONIVEL) {
				veiculo.setStatus(StatusVeiculo.EM_OPERACAO);
			}
		}

		Alocacao a = new Alocacao();
		a.setOperador(operador);
		a.setAtividade(req.atividade());
		a.setVeiculo(veiculo);
		a.setTalhao(talhao);
		a.setDescricao(req.descricao() == null || req.descricao().isBlank() ? null : req.descricao().trim());
		a.setInicio(Instant.now());
		a.setPrevisaoFim(req.previsaoFim());
		a.setResponsavel(responsavel);
		a.setIdCliente(req.idCliente());
		return alocacoes.save(a);
	}

	/** Encerra a atividade e libera a máquina. Encerrar duas vezes não tem efeito (seguro para a fila offline). */
	@Transactional
	public AlocacaoResponse encerrar(Long id) {
		Alocacao a = alocacoes.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Alocação", id));
		if (!a.emAndamento()) {
			return AlocacaoResponse.de(a);
		}
		a.setEncerradaEm(Instant.now());
		Veiculo v = a.getVeiculo();
		if (v != null) {
			boolean liberarOperacao = v.getStatus() == StatusVeiculo.EM_OPERACAO && a.getAtividade() != TipoAtividade.MANUTENCAO;
			boolean liberarManutencao = v.getStatus() == StatusVeiculo.MANUTENCAO && a.getAtividade() == TipoAtividade.MANUTENCAO;
			if (liberarOperacao || liberarManutencao) {
				v.setStatus(StatusVeiculo.DISPONIVEL);
			}
		}
		return AlocacaoResponse.de(a);
	}

	private Veiculo validarMaquina(AlocacaoRequest req, Operador operador) {
		Veiculo v = veiculos.findComBloqueioById(req.veiculoId())
			.orElseThrow(() -> new RecursoNaoEncontradoException("Veículo", req.veiculoId()));
		boolean manutencao = req.atividade() == TipoAtividade.MANUTENCAO;
		if (v.getStatus() == StatusVeiculo.INATIVO) {
			throw new RegraNegocioException(v.getIdentificacao() + " está inativa");
		}
		if (v.getStatus() == StatusVeiculo.MANUTENCAO && !manutencao) {
			throw new RegraNegocioException(v.getIdentificacao() + " está em manutenção");
		}
		// Na manutenção quem trabalha é o mecânico: não precisa ser habilitado a operar a máquina.
		if (!manutencao && !operador.habilitadoPara(v.getTipo())) {
			throw new RegraNegocioException("%s não tem habilitação para operar %s".formatted(operador.getNome(),
					descrever(v.getTipo())));
		}
		alocacoes.findFirstByVeiculoIdAndEncerradaEmIsNull(v.getId()).ifPresent(outra -> {
			throw new RegraNegocioException(
					"%s já está com %s".formatted(v.getIdentificacao(), outra.getOperador().getNome()));
		});
		return v;
	}

	static String descrever(TipoAtividade a) {
		return switch (a) {
			case COLHEITA -> "colheita";
			case PLANTIO -> "plantio";
			case PULVERIZACAO -> "pulverização";
			case ADUBACAO -> "adubação";
			case TRANSPORTE -> "transporte";
			case MANUTENCAO -> "manutenção";
			case OUTRA -> "outra atividade";
		};
	}

	static String descrever(TipoVeiculo t) {
		return switch (t) {
			case TRATOR -> "trator";
			case COLHEITADEIRA -> "colheitadeira";
			case PULVERIZADOR -> "pulverizador";
			case CAMINHAO -> "caminhão";
			case UTILITARIO -> "utilitário";
			case IMPLEMENTO -> "implemento";
		};
	}
}
