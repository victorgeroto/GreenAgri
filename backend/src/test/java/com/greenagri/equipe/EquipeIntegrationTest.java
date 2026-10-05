package com.greenagri.equipe;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.TestExecutionListeners.MergeMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.greenagri.Acesso;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.fazenda.FazendaDoTesteListener;

/** Regras de alocação da equipe sobre os dados de demonstração (seed/operadores.json). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@TestExecutionListeners(listeners = FazendaDoTesteListener.class, mergeMode = MergeMode.MERGE_WITH_DEFAULTS)
class EquipeIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	private static RequestPostProcessor operador() {
		return Acesso.operador();
	}

	@Test
	void cadastraOperadorComMatriculaUnicaNaFazenda() throws Exception {
		String corpo = """
				{"matricula":"op-100","nome":"Novo Operador","funcao":"TRATORISTA","turno":"MANHA","habilitacoes":["TRATOR"]}
				""";
		mvc.perform(post("/api/equipe/operadores").with(operador()).contentType(MediaType.APPLICATION_JSON).content(corpo))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.matricula").value("OP-100"))
			.andExpect(jsonPath("$.situacao").value("DISPONIVEL"));
		mvc.perform(post("/api/equipe/operadores").with(operador()).contentType(MediaType.APPLICATION_JSON).content(corpo))
			.andExpect(status().isUnprocessableEntity());
	}

	@Test
	void listaMostraSituacaoDeCadaOperador() throws Exception {
		mvc.perform(get("/api/equipe/operadores").with(operador()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[?(@.nome == 'Carlos Mendes')].situacao").value("DISPONIVEL"))
			.andExpect(jsonPath("$[?(@.nome == 'Rafael Souza')].situacao").value("AUSENTE"))
			.andExpect(jsonPath("$[?(@.nome == 'Rafael Souza')].motivoAusencia").value("Férias"))
			.andExpect(jsonPath("$[?(@.nome == 'José Aparecido Lima')].situacao").value("EM_ATIVIDADE"))
			.andExpect(jsonPath("$[?(@.nome == 'José Aparecido Lima')].alocacaoAtual.veiculoIdentificacao").value("TR-01"));
	}

	@Test
	void alocarColocaMaquinaEmOperacaoEEncerrarLibera() throws Exception {
		long carlos = operadorId("Carlos Mendes");
		long ch01 = veiculoId("CH-01");

		JsonNode alocacao = json(alocar(carlos, "COLHEITA", ch01, null).andExpect(status().isCreated()));
		mvc.perform(get("/api/veiculos/" + ch01).with(operador())).andExpect(jsonPath("$.status").value("EM_OPERACAO"));

		mvc.perform(post("/api/equipe/alocacoes/" + alocacao.get("id").asLong() + "/encerrar").with(operador()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.encerradaEm").isNotEmpty());
		mvc.perform(get("/api/veiculos/" + ch01).with(operador())).andExpect(jsonPath("$.status").value("DISPONIVEL"));
	}

	@Test
	void maquinaEOperadorNaoFicamEmDuasAtividades() throws Exception {
		long carlos = operadorId("Carlos Mendes");
		long ch01 = veiculoId("CH-01");
		alocar(carlos, "COLHEITA", ch01, null).andExpect(status().isCreated());

		alocar(carlos, "PULVERIZACAO", veiculoId("PV-01"), null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value(containsString("já está em uma atividade de colheita")));
		alocar(operadorId("Ana Paula Ribeiro"), "OUTRA", ch01, null) // sem habilitação, mas a máquina já está ocupada
			.andExpect(status().isUnprocessableEntity());
	}

	@Test
	void exigeHabilitacaoParaOTipoDeMaquina() throws Exception {
		alocar(operadorId("Ana Paula Ribeiro"), "COLHEITA", veiculoId("CH-01"), null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value("Ana Paula Ribeiro não tem habilitação para operar colheitadeira"));
	}

	@Test
	void operadorAusenteNaoPodeSerAlocado() throws Exception {
		alocar(operadorId("Rafael Souza"), "PLANTIO", veiculoId("PV-01"), null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value(containsString("está ausente até")));
	}

	@Test
	void maquinaEmManutencaoSoRecebeManutencao() throws Exception {
		alocar(operadorId("Carlos Mendes"), "PLANTIO", veiculoId("TR-02"), null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value("TR-02 está em manutenção"));
	}

	@Test
	void atividadeSemMaquinaPrecisaDeTalhao() throws Exception {
		long antonio = operadorId("Antônio Carlos Pereira");
		alocar(antonio, "OUTRA", null, null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value("Informe a máquina ou o talhão da atividade"));
		alocar(antonio, "OUTRA", null, talhaoId("T-03")).andExpect(status().isCreated())
			.andExpect(jsonPath("$.talhaoCodigo").value("T-03"));
	}

	@Test
	void reenvioDaFilaOfflineNaoDuplicaAlocacao() throws Exception {
		String corpo = """
				{"operadorId":%d,"atividade":"PULVERIZACAO","veiculoId":%d,"idCliente":"%s"}
				""".formatted(operadorId("Ana Paula Ribeiro"), veiculoId("PV-01"), UUID.randomUUID());
		long primeira = json(mvc.perform(post("/api/equipe/alocacoes").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content(corpo)).andExpect(status().isCreated())).get("id").asLong();
		mvc.perform(post("/api/equipe/alocacoes").with(operador()).contentType(MediaType.APPLICATION_JSON).content(corpo))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.id").value(primeira));
	}

	private ResultActions alocar(long operadorId, String atividade, Long veiculoId, Long talhaoId) throws Exception {
		String corpo = """
				{"operadorId":%d,"atividade":"%s","veiculoId":%s,"talhaoId":%s}
				""".formatted(operadorId, atividade, veiculoId, talhaoId);
		return mvc.perform(post("/api/equipe/alocacoes").with(operador()).contentType(MediaType.APPLICATION_JSON).content(corpo));
	}

	private long operadorId(String nome) throws Exception {
		return buscar("/api/equipe/operadores", "nome", nome);
	}

	private long veiculoId(String identificacao) throws Exception {
		return buscar("/api/veiculos", "identificacao", identificacao);
	}

	private long talhaoId(String codigo) throws Exception {
		return buscar("/api/talhoes", "codigo", codigo);
	}

	private long buscar(String caminho, String campo, String valor) throws Exception {
		for (JsonNode n : json(mvc.perform(get(caminho).with(operador())))) {
			if (valor.equals(n.get(campo).asText())) {
				return n.get("id").asLong();
			}
		}
		throw new AssertionError(valor + " não encontrado em " + caminho);
	}

	private JsonNode json(ResultActions r) throws Exception {
		return mapper.readTree(r.andReturn().getResponse().getContentAsString());
	}
}
