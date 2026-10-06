package com.greenagri;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.fazenda.FazendaDoTesteListener;

/** Sobe a aplicação com os dados de demonstração e exercita os fluxos principais pela API. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
@TestExecutionListeners(listeners = FazendaDoTesteListener.class, mergeMode = MergeMode.MERGE_WITH_DEFAULTS)
class ApiIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	private static RequestPostProcessor operador() {
		return Acesso.operador();
	}

	@Test
	void loginComCredenciaisDeDemonstracao() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@greenagri.dev\",\"senha\":\"Teste-Seguro-2026\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.usuario.perfil").value("ADMIN"));

		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@greenagri.dev\",\"senha\":\"errada\"}"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void rotasProtegidasExigemToken() throws Exception {
		mvc.perform(get("/api/produtos")).andExpect(status().isUnauthorized());
	}

	@Test
	void entradaESaidaAtualizamSaldo() throws Exception {
		long id = criarProduto("TST-01", 0);

		movimentar(id, "ENTRADA", 100, null).andExpect(status().isCreated())
			.andExpect(jsonPath("$.saldoApos").value(100));
		movimentar(id, "SAIDA", 30, null).andExpect(jsonPath("$.saldoApos").value(70));
		movimentar(id, "AJUSTE", 65, null).andExpect(jsonPath("$.saldoApos").value(65));

		mvc.perform(get("/api/produtos/" + id).with(operador()))
			.andExpect(jsonPath("$.quantidadeAtual").value(65));
	}

	@Test
	void saidaMaiorQueSaldoEhRecusada() throws Exception {
		long id = criarProduto("TST-02", 10);
		movimentar(id, "SAIDA", 11, null)
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value(containsString("Saldo insuficiente")));
	}

	@Test
	void reenvioDaFilaOfflineNaoDuplicaMovimentacao() throws Exception {
		long id = criarProduto("TST-03", 0);
		String idCliente = UUID.randomUUID().toString();

		movimentar(id, "ENTRADA", 50, idCliente).andExpect(jsonPath("$.saldoApos").value(50));
		movimentar(id, "ENTRADA", 50, idCliente).andExpect(jsonPath("$.saldoApos").value(50));

		mvc.perform(get("/api/estoque/movimentacoes").param("produtoId", String.valueOf(id)).with(operador()))
			.andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void excluirProdutoExigePerfilAdmin() throws Exception {
		long id = criarProduto("TST-04", 0);
		mvc.perform(delete("/api/produtos/" + id)
			.with(operador())).andExpect(status().isForbidden());
	}

	@Test
	void concluirColheitaLancaProducaoNoEstoque() throws Exception {
		long produtoId = criarProduto("TST-05", 0);
		String colheita = """
				{"talhaoId":%d,"cultura":"Soja","areaHa":10,"dataPlantio":"2026-01-01",
				 "previsaoColheita":"2026-05-01","producaoEstimadaKg":30000,"produtoId":%d}
				""".formatted(talhaoId("T-01"), produtoId);
		JsonNode criada = json(mvc.perform(post("/api/colheitas").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content(colheita))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.safra").value("2025/26"))
			.andExpect(jsonPath("$.status").value("PLANEJADA")));

		mvc.perform(post("/api/colheitas/" + criada.get("id").asLong() + "/concluir").with(operador())
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"dataColheita\":\"2026-05-03\",\"producaoRealKg\":36000}"))
			.andExpect(jsonPath("$.status").value("CONCLUIDA"))
			.andExpect(jsonPath("$.produtividadeSacasHa").value(60.0));

		// 36.000 kg / 60 kg por saca = 600 sacas
		mvc.perform(get("/api/produtos/" + produtoId).with(operador()))
			.andExpect(jsonPath("$.quantidadeAtual").value(600));
	}

	@Test
	void telemetriaAutenticaDispositivoEDescartaDuplicadas() throws Exception {
		String lote = """
				{"codigo":"SOLO-T02","firmware":"1.3.0","leituras":[
				  {"ts":%d,"us":12.0,"t":20.1,"bat":80},
				  {"ts":%d,"us":12.0,"t":20.1,"bat":80}]}
				""".formatted(System.currentTimeMillis() / 1000 + 60, System.currentTimeMillis() / 1000 + 60);

		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "chave-errada")
			.contentType(MediaType.APPLICATION_JSON).content(lote)).andExpect(status().isUnauthorized());

		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "teste-solo-t02")
			.contentType(MediaType.APPLICATION_JSON).content(lote))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.aceitas").value(1))
			.andExpect(jsonPath("$.duplicadas").value(1));
	}

	@Test
	void painelIotMostraDivergenciaDoSiloSimulado() throws Exception {
		mvc.perform(get("/api/iot/dispositivos").with(operador()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[?(@.codigo == 'SILO-02')].silo.divergente").value(true))
			.andExpect(jsonPath("$[?(@.codigo == 'SOLO-T05')].online").value(false));
	}

	@Test
	void colheitadeiraOperandoNoTalhaoIniciaAColheita() throws Exception {
		JsonNode t04 = talhao("T-04");
		long trigo = colheitaAtiva("T-04").get("id").asLong();
		long agora = System.currentTimeMillis() / 1000 + 60;
		String lote = """
				{"codigo":"RAST-CH01","leituras":[
				  {"ts":%d,"lat":-24.8800,"lon":-53.5600,"vel":18,"op":false},
				  {"ts":%d,"lat":%s,"lon":%s,"vel":6.5,"op":true}]}
				""".formatted(agora - 30, agora, t04.get("latitude").asText(), t04.get("longitude").asText());

		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "teste-rast-ch01")
			.contentType(MediaType.APPLICATION_JSON).content(lote))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.mudancasStatus").value(1));

		mvc.perform(get("/api/colheitas/" + trigo).with(operador()))
			.andExpect(jsonPath("$.status").value("EM_COLHEITA"));
		mvc.perform(get("/api/colheitas/" + trigo + "/eventos").with(operador()))
			.andExpect(jsonPath("$[-1:].origem").value("DISPOSITIVO"))
			.andExpect(jsonPath("$[-1:].statusAnterior").value("EM_DESENVOLVIMENTO"))
			.andExpect(jsonPath("$[-1:].responsavel").value(org.hamcrest.Matchers.contains(containsString("CH-01"))));
	}

	@Test
	void maquinaForaDosTalhoesNaoMudaStatus() throws Exception {
		String lote = """
				{"codigo":"RAST-CH01","leituras":[{"ts":%d,"lat":-24.8800,"lon":-53.5600,"vel":4,"op":true}]}
				""".formatted(System.currentTimeMillis() / 1000 + 60);
		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "teste-rast-ch01")
			.contentType(MediaType.APPLICATION_JSON).content(lote))
			.andExpect(jsonPath("$.mudancasStatus").value(0));
	}

	@Test
	void talhaoComLavouraAtivaNaoAceitaOutra() throws Exception {
		String colheita = """
				{"talhaoId":%d,"cultura":"Soja","dataPlantio":"2026-09-01","previsaoColheita":"2027-01-20",
				 "status":"EM_DESENVOLVIMENTO"}
				""".formatted(talhaoId("T-02"));
		mvc.perform(post("/api/colheitas").with(operador()).contentType(MediaType.APPLICATION_JSON).content(colheita))
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value(containsString("ocupado por Milho safrinha")));
	}

	@Test
	void statusSoAvanca() throws Exception {
		long milho = colheitaAtiva("T-02").get("id").asLong();
		mvc.perform(post("/api/colheitas/" + milho + "/status").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PLANEJADA\"}"))
			.andExpect(status().isUnprocessableEntity());
		mvc.perform(post("/api/colheitas/" + milho + "/status").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"EM_COLHEITA\",\"observacao\":\"Início manual\"}"))
			.andExpect(jsonPath("$.status").value("EM_COLHEITA"));
	}

	@Test
	void separaColheitasPorSafraETalhoesTemArea() throws Exception {
		mvc.perform(get("/api/colheitas/safras").with(operador()))
			.andExpect(jsonPath("$", hasSize(3)));
		mvc.perform(get("/api/colheitas").param("safra", "2024/25").with(operador()))
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].talhao").value("T-05"));
		mvc.perform(get("/api/talhoes").with(operador()))
			.andExpect(jsonPath("$", hasSize(5)))
			.andExpect(jsonPath("$[0].geometria.type").value("Polygon"))
			.andExpect(jsonPath("$[0].areaHa").isNumber());
	}

	private JsonNode talhao(String codigo) throws Exception {
		for (JsonNode t : json(mvc.perform(get("/api/talhoes").with(operador())))) {
			if (t.get("codigo").asText().equals(codigo)) {
				return t;
			}
		}
		throw new AssertionError("Talhão não encontrado: " + codigo);
	}

	private long talhaoId(String codigo) throws Exception {
		return talhao(codigo).get("id").asLong();
	}

	private JsonNode colheitaAtiva(String talhao) throws Exception {
		for (JsonNode c : json(mvc.perform(get("/api/colheitas").with(operador())))) {
			if (c.get("talhao").asText().equals(talhao) && c.get("status").asText().equals("EM_DESENVOLVIMENTO")) {
				return c;
			}
		}
		throw new AssertionError("Sem colheita ativa em " + talhao);
	}

	@Test
	void produtoAceitaFotoValidaERecusaConteudoQueNaoEImagem() throws Exception {
		String base = """
				{"sku":"%s","nome":"Com foto","categoria":"GRAOS","unidade":"SACA","estoqueMinimo":1,"imagem":"%s"}
				""";
		mvc.perform(post("/api/produtos").with(operador()).contentType(MediaType.APPLICATION_JSON)
			.content(base.formatted("IMG-01", "data:image/jpeg;base64,/9j/4AAQSkZJRg==")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.imagem").value("data:image/jpeg;base64,/9j/4AAQSkZJRg=="));

		mvc.perform(post("/api/produtos").with(operador()).contentType(MediaType.APPLICATION_JSON)
			.content(base.formatted("IMG-02", "javascript:alert(1)")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.imagem").value("Imagem inválida"));
	}

	@Test
	void movimentacaoGuardaFotoERecusaConteudoInvalido() throws Exception {
		long id = criarProduto("TST-FOTO", 10);
		String corpo = """
				{"produtoId":%d,"tipo":"ENTRADA","quantidade":5,"foto":"%s"}
				""";
		mvc.perform(post("/api/estoque/movimentacoes").with(operador()).contentType(MediaType.APPLICATION_JSON)
			.content(corpo.formatted(id, "data:image/jpeg;base64,/9j/4AAQ")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.foto").value("data:image/jpeg;base64,/9j/4AAQ"));
		mvc.perform(get("/api/estoque/movimentacoes").param("produtoId", String.valueOf(id)).with(operador()))
			.andExpect(jsonPath("$[0].foto").value("data:image/jpeg;base64,/9j/4AAQ"));
		mvc.perform(post("/api/estoque/movimentacoes").with(operador()).contentType(MediaType.APPLICATION_JSON)
			.content(corpo.formatted(id, "https://site-externo/x.jpg")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.campos.foto").value("Foto inválida"));
	}

	private long criarProduto(String sku, int saldoInicial) throws Exception {
		String body = """
				{"sku":"%s","nome":"Produto %s","categoria":"GRAOS","unidade":"SACA",
				 "estoqueMinimo":5,"quantidadeInicial":%d}
				""".formatted(sku, sku, saldoInicial);
		return json(mvc.perform(post("/api/produtos").with(operador()).contentType(MediaType.APPLICATION_JSON)
			.content(body)).andExpect(status().isCreated())).get("id").asLong();
	}

	private ResultActions movimentar(long produtoId, String tipo, int qtd, String idCliente) throws Exception {
		String body = """
				{"produtoId":%d,"tipo":"%s","quantidade":%d%s}
				""".formatted(produtoId, tipo, qtd, idCliente == null ? "" : ",\"idCliente\":\"" + idCliente + "\"");
		return mvc.perform(post("/api/estoque/movimentacoes").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private JsonNode json(ResultActions result) throws Exception {
		return mapper.readTree(result.andReturn().getResponse().getContentAsString());
	}
}
