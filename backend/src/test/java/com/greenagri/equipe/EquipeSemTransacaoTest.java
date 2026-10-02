package com.greenagri.equipe;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Sem {@code @Transactional} de propósito: como em produção, cada requisição tem a
 * própria transação, então respostas montadas fora dela quebram com associações lazy.
 * Ao final o operador e a máquina voltam ao estado da carga inicial.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class EquipeSemTransacaoTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper mapper;

	@Test
	void alocarEEncerrarRespondemComOsDadosDoOperadorEDaMaquina() throws Exception {
		var usuario = jwt().jwt(j -> j.claim("nome", "Encarregado").claim("perfil", "OPERADOR"));
		long juliana = id("/api/equipe/operadores", "nome", "Juliana Martins");
		long hilux = id("/api/veiculos", "identificacao", "QPA8C93");

		String resposta = mvc.perform(post("/api/equipe/alocacoes").with(usuario).contentType(MediaType.APPLICATION_JSON)
			.content("{\"operadorId\":%d,\"atividade\":\"TRANSPORTE\",\"veiculoId\":%d}".formatted(juliana, hilux)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.operadorNome").value("Juliana Martins"))
			.andExpect(jsonPath("$.veiculoIdentificacao").value("QPA8C93"))
			.andReturn().getResponse().getContentAsString();

		mvc.perform(post("/api/equipe/alocacoes/" + mapper.readTree(resposta).get("id").asLong() + "/encerrar").with(usuario))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.operadorNome").value("Juliana Martins"))
			.andExpect(jsonPath("$.encerradaEm").isNotEmpty());

		mvc.perform(get("/api/equipe/alocacoes").with(usuario)).andExpect(status().isOk());
	}

	private long id(String caminho, String campo, String valor) throws Exception {
		var usuario = jwt().jwt(j -> j.claim("nome", "Encarregado").claim("perfil", "OPERADOR"));
		for (JsonNode n : mapper.readTree(mvc.perform(get(caminho).with(usuario)).andReturn().getResponse().getContentAsString())) {
			if (valor.equals(n.get(campo).asText())) {
				return n.get("id").asLong();
			}
		}
		throw new AssertionError(valor);
	}
}
