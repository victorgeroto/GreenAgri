package com.greenagri.fazenda;

import static com.greenagri.Acesso.BOA_VISTA;
import static com.greenagri.Acesso.SANTA_HELENA;
import static com.greenagri.Acesso.admin;
import static com.greenagri.Acesso.operador;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.Acesso;

/**
 * Isolamento entre fazendas pela API. Sem {@code @Transactional} de propósito: cada
 * requisição abre a própria sessão já com a fazenda do header, como em produção.
 * Só grava numa fazenda criada pelo próprio teste, para não afetar os outros.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class MultiFazendaIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	@Test
	void usuarioVeSoAsFazendasDeQueEMembro() throws Exception {
		mvc.perform(get("/api/fazendas").with(admin(SANTA_HELENA)))
			.andExpect(jsonPath("$[*].nome", hasItem("Fazenda Santa Helena")))
			.andExpect(jsonPath("$[*].nome", hasItem("Fazenda Boa Vista")));
		mvc.perform(get("/api/fazendas").with(operador()))
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].nome").value("Fazenda Santa Helena"));
	}

	@Test
	void exigeFazendaSelecionadaEComAcesso() throws Exception {
		mvc.perform(get("/api/produtos").with(Acesso.como("admin@greenagri.dev", "Admin", "ADMIN", null)))
			.andExpect(status().isBadRequest());
		mvc.perform(get("/api/produtos").with(Acesso.como("operador@greenagri.dev", "Operador", "OPERADOR", BOA_VISTA)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.detail").value("Você não tem acesso a esta fazenda"));
	}

	@Test
	void cadaFazendaListaSoOsPropriosDados() throws Exception {
		mvc.perform(get("/api/produtos").with(admin(SANTA_HELENA)))
			.andExpect(jsonPath("$[*].sku", hasItem("FE-NPK-01")))
			.andExpect(jsonPath("$[*].sku", not(hasItem("SE-FEIJAO-01"))));
		mvc.perform(get("/api/produtos").with(admin(BOA_VISTA)))
			.andExpect(jsonPath("$[*].sku", hasItem("SE-FEIJAO-01")))
			.andExpect(jsonPath("$[*].sku", not(hasItem("FE-NPK-01"))));
		mvc.perform(get("/api/talhoes").with(admin(BOA_VISTA))).andExpect(jsonPath("$[*].codigo", hasItem("P-01")))
			.andExpect(jsonPath("$[*].codigo", not(hasItem("T-04"))));
		mvc.perform(get("/api/equipe/operadores").with(admin(BOA_VISTA)))
			.andExpect(jsonPath("$[*].nome", hasItem("Paulo Henrique Duarte")))
			.andExpect(jsonPath("$[*].nome", not(hasItem("Carlos Mendes"))));
		mvc.perform(get("/api/iot/dispositivos").with(admin(BOA_VISTA))).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void registroDeOutraFazendaNaoPodeSerLidoNemAlterado() throws Exception {
		long npk = idPor("/api/produtos", "sku", "FE-NPK-01", admin(SANTA_HELENA));
		mvc.perform(get("/api/produtos/" + npk).with(admin(BOA_VISTA))).andExpect(status().isNotFound());
		mvc.perform(put("/api/produtos/" + npk).with(admin(BOA_VISTA)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"sku\":\"X\",\"nome\":\"Invasão\",\"categoria\":\"OUTROS\",\"unidade\":\"KG\",\"estoqueMinimo\":0}"))
			.andExpect(status().isNotFound());
		mvc.perform(post("/api/estoque/movimentacoes").with(admin(BOA_VISTA)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"produtoId\":%d,\"tipo\":\"SAIDA\",\"quantidade\":1}".formatted(npk)))
			.andExpect(status().isNotFound());
		mvc.perform(get("/api/produtos/" + npk).with(admin(SANTA_HELENA)))
			.andExpect(jsonPath("$.nome").value("Fertilizante NPK 04-14-08"));
	}

	@Test
	void fazendaNovaComecaVaziaEAceitaCodigosJaUsadosEmOutra() throws Exception {
		String criada = mvc.perform(post("/api/fazendas").with(admin(SANTA_HELENA)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"nome\":\"Sítio Teste\",\"municipio\":\"Chapecó\",\"uf\":\"SC\"}"))
			.andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		long nova = mapper.readTree(criada).get("id").asLong();
		mvc.perform(post("/api/fazendas").with(admin(SANTA_HELENA)).contentType(MediaType.APPLICATION_JSON)
			.content("{\"nome\":\"sítio teste\",\"municipio\":\"Xanxerê\",\"uf\":\"SC\"}"))
			.andExpect(status().isUnprocessableEntity());

		mvc.perform(get("/api/produtos").with(admin(nova))).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(get("/api/dashboard").with(admin(nova))).andExpect(jsonPath("$.produtos").value(0));
		String talhao = "{\"codigo\":\"T-01\",\"nome\":\"Talhão novo\"}";
		mvc.perform(post("/api/talhoes").with(admin(nova)).contentType(MediaType.APPLICATION_JSON).content(talhao))
			.andExpect(status().isCreated());
		mvc.perform(post("/api/talhoes").with(admin(nova)).contentType(MediaType.APPLICATION_JSON).content(talhao))
			.andExpect(status().isUnprocessableEntity());
		mvc.perform(get("/api/talhoes").with(admin(SANTA_HELENA)))
			.andExpect(jsonPath("$[?(@.codigo == 'T-01')].nome").value("Talhão da Divisa"));
		// Quem não é membro da fazenda nova não entra nela.
		mvc.perform(get("/api/produtos").with(Acesso.como("operador@greenagri.dev", "Operador", "OPERADOR", nova)))
			.andExpect(status().isForbidden());
	}

	@Test
	void telemetriaGravaNaFazendaDoDispositivo() throws Exception {
		long agora = System.currentTimeMillis() / 1000 + 120;
		mvc.perform(post("/api/iot/telemetria").header("X-Device-Key", "teste-solo-t03")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"codigo\":\"SOLO-T03\",\"leituras\":[{\"ts\":%d,\"us\":33.3}]}".formatted(agora)))
			.andExpect(status().isAccepted())
			.andExpect(jsonPath("$.aceitas").value(1));
		mvc.perform(get("/api/iot/dispositivos").with(admin(SANTA_HELENA)))
			.andExpect(jsonPath("$[?(@.codigo == 'SOLO-T03')].ultimaLeitura.umidadeSolo").value(33.3));
		mvc.perform(get("/api/iot/dispositivos").with(admin(BOA_VISTA))).andExpect(jsonPath("$", hasSize(0)));
	}

	private long idPor(String caminho, String campo, String valor, RequestPostProcessor acesso) throws Exception {
		for (JsonNode n : mapper.readTree(mvc.perform(get(caminho).with(acesso)).andReturn().getResponse().getContentAsString())) {
			if (valor.equals(n.get(campo).asText())) {
				return n.get("id").asLong();
			}
		}
		throw new AssertionError(valor);
	}
}
