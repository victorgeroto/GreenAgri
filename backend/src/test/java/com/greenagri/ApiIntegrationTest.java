package com.greenagri;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Sobe a aplicação com os dados de demonstração e exercita os fluxos principais pela API. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ApiIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	private static JwtRequestPostProcessor operador() {
		return jwt().jwt(j -> j.claim("nome", "Teste").claim("perfil", "OPERADOR"));
	}

	@Test
	void loginComCredenciaisDeDemonstracao() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@greenagri.dev\",\"senha\":\"greenagri123\"}"))
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
				{"talhao":"T-99","cultura":"Soja","areaHa":10,"dataPlantio":"2026-01-01",
				 "previsaoColheita":"2026-05-01","producaoEstimadaKg":30000,"produtoId":%d}
				""".formatted(produtoId);
		JsonNode criada = json(mvc.perform(post("/api/colheitas").with(operador())
			.contentType(MediaType.APPLICATION_JSON).content(colheita)).andExpect(status().isCreated()));

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

		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "dev-key-solo-t02")
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
