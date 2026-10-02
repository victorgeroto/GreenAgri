package com.greenagri.seed;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.equipe.Alocacao;
import com.greenagri.equipe.EquipeDtos.AlocacaoRequest;
import com.greenagri.equipe.EquipeService;
import com.greenagri.equipe.Funcao;
import com.greenagri.equipe.Operador;
import com.greenagri.equipe.OperadorRepository;
import com.greenagri.equipe.TipoAtividade;
import com.greenagri.equipe.Turno;
import com.greenagri.frota.TipoVeiculo;
import com.greenagri.frota.Veiculo;
import com.greenagri.talhao.Talhao;

import lombok.RequiredArgsConstructor;

/** Carrega a equipe fictícia de {@code seed/operadores.json}; chamado pelo {@link DataSeeder}. */
@Component
@RequiredArgsConstructor
class EquipeSeed {

	private final ObjectMapper mapper;
	private final OperadorRepository operadores;
	private final EquipeService equipeService;

	record AlocacaoSeed(TipoAtividade atividade, String veiculo, String talhao, String descricao, int horasAtras,
			Integer horasPrevistas) {
	}

	record OperadorSeed(String matricula, String nome, Funcao funcao, Turno turno, String cnh,
			List<TipoVeiculo> habilitacoes, Integer ausenteDias, String motivoAusencia, AlocacaoSeed alocacao) {
	}

	int carregar(Map<String, Veiculo> veiculos, Map<String, Talhao> talhoes) throws IOException {
		List<OperadorSeed> lista;
		try (InputStream in = new ClassPathResource("seed/operadores.json").getInputStream()) {
			lista = mapper.readValue(in, new TypeReference<List<OperadorSeed>>() { });
		}
		Instant agora = Instant.now();
		for (OperadorSeed s : lista) {
			Operador o = new Operador();
			o.setMatricula(s.matricula());
			o.setNome(s.nome());
			o.setFuncao(s.funcao());
			o.setTurno(s.turno());
			o.setCnhCategoria(s.cnh());
			o.setHabilitacoes(s.habilitacoes().isEmpty() ? EnumSet.noneOf(TipoVeiculo.class) : EnumSet.copyOf(s.habilitacoes()));
			if (s.ausenteDias() != null) {
				o.setAusenteAte(LocalDate.now().plusDays(s.ausenteDias()));
				o.setMotivoAusencia(s.motivoAusencia());
			}
			operadores.save(o);

			AlocacaoSeed a = s.alocacao();
			if (a != null) {
				// Passa pelas regras reais de alocação (habilitação, máquina livre, status da máquina).
				Alocacao alocacao = equipeService.alocar(new AlocacaoRequest(o.getId(), a.atividade(),
						a.veiculo() == null ? null : veiculos.get(a.veiculo()).getId(),
						a.talhao() == null ? null : talhoes.get(a.talhao()).getId(), a.descricao(),
						a.horasPrevistas() == null ? null : agora.plus(Duration.ofHours(a.horasPrevistas() - a.horasAtras())),
						null), "Carga inicial");
				alocacao.setInicio(agora.minus(Duration.ofHours(a.horasAtras())));
			}
		}
		return lista.size();
	}
}
