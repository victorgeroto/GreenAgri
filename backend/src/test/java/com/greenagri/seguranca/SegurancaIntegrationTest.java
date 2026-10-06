package com.greenagri.seguranca;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/** Proteções de segurança da API (ver docs/SEGURANCA.md). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class SegurancaIntegrationTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	JwtEncoder jwtEncoder;

	/** Cada teste usa um IP próprio para não interferir nos limites dos outros. */
	private static RequestPostProcessor ip(String ip) {
		return r -> {
			r.setRemoteAddr(ip);
			return r;
		};
	}

	private static String login(String email, String senha) {
		return "{\"email\":\"%s\",\"senha\":\"%s\"}".formatted(email, senha);
	}

	@Test
	void bloqueiaLoginAposTentativasErradasMesmoComSenhaCorreta() throws Exception {
		for (int i = 0; i < 5; i++) {
			mvc.perform(post("/api/auth/login").with(ip("10.1.0.1")).contentType(MediaType.APPLICATION_JSON)
				.content(login("admin@greenagri.dev", "errada-" + i)))
				.andExpect(status().isUnauthorized());
		}
		mvc.perform(post("/api/auth/login").with(ip("10.1.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(login("admin@greenagri.dev", "Teste-Seguro-2026")))
			.andExpect(status().isTooManyRequests())
			.andExpect(header().exists("Retry-After"))
			.andExpect(jsonPath("$.detail").value(containsString("Muitas tentativas")));
		// Outro IP não é afetado pelo bloqueio desta combinação conta + IP.
		mvc.perform(post("/api/auth/login").with(ip("10.1.0.2")).contentType(MediaType.APPLICATION_JSON)
			.content(login("admin@greenagri.dev", "Teste-Seguro-2026")))
			.andExpect(status().isOk());
	}

	@Test
	void mesmaRespostaParaEmailInexistenteESenhaErrada() throws Exception {
		mvc.perform(post("/api/auth/login").with(ip("10.2.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(login("ninguem@exemplo.com", "Qualquer-123")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos"));
		mvc.perform(post("/api/auth/login").with(ip("10.2.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(login("admin@greenagri.dev", "Qualquer-123")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("E-mail ou senha inválidos"));
	}

	@Test
	void cadastroExigeSenhaForteELimitaPorIp() throws Exception {
		String fraca = "{\"nome\":\"Maria Souza\",\"email\":\"maria%s@exemplo.com\",\"senha\":\"%s\"}";
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(fraca.formatted(1, "1234567890")))
			.andExpect(status().isUnprocessableEntity());
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(fraca.formatted(2, "maria-2026-x")))
			.andExpect(status().isUnprocessableEntity())
			.andExpect(jsonPath("$.detail").value("A senha não pode conter seu nome ou e-mail"));
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(fraca.formatted(3, "Ipe-Amarelo-77")))
			.andExpect(status().isCreated());
		// Limite de 5 cadastros por hora por IP (3 já usados acima).
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON).content(fraca.formatted(4, "Ipe-Amarelo-77")));
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON).content(fraca.formatted(5, "Ipe-Amarelo-77")));
		mvc.perform(post("/api/auth/registro").with(ip("10.3.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content(fraca.formatted(6, "Ipe-Amarelo-77")))
			.andExpect(status().isTooManyRequests());
	}

	@Test
	void perfilMostraFazendasETrocaSenhaExigeASenhaAtual() throws Exception {
		String email = "perfil" + System.nanoTime() + "@exemplo.com";
		String token = com.jayway.jsonpath.JsonPath.read(mvc.perform(post("/api/auth/registro").with(ip("10.5.0.1")).contentType(MediaType.APPLICATION_JSON)
			.content("{\"nome\":\"Rita Lopes\",\"email\":\"%s\",\"senha\":\"Cerrado-Verde-41\"}".formatted(email)))
			.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.token");
		mvc.perform(get("/api/conta").header("Authorization", "Bearer " + token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(email))
			.andExpect(jsonPath("$.perfil").value("OPERADOR"))
			.andExpect(jsonPath("$.fazendas").isEmpty());
		mvc.perform(post("/api/conta/senha").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
			.content("{\"senhaAtual\":\"errada-123\",\"novaSenha\":\"Ipe-Roxo-2027\"}"))
			.andExpect(status().isUnprocessableEntity());
		mvc.perform(post("/api/conta/senha").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
			.content("{\"senhaAtual\":\"Cerrado-Verde-41\",\"novaSenha\":\"Ipe-Roxo-2027\"}"))
			.andExpect(status().isNoContent());
		mvc.perform(post("/api/auth/login").with(ip("10.5.0.2")).contentType(MediaType.APPLICATION_JSON).content(login(email, "Ipe-Roxo-2027")))
			.andExpect(status().isOk());
	}

	@Test
	void respostasTrazemCabecalhosDeSeguranca() throws Exception {
		mvc.perform(get("/api/produtos"))
			.andExpect(status().isUnauthorized())
			.andExpect(header().string("Content-Security-Policy", containsString("default-src 'none'")))
			.andExpect(header().string("X-Frame-Options", "DENY"))
			.andExpect(header().string("X-Content-Type-Options", "nosniff"))
			.andExpect(header().string("Referrer-Policy", "no-referrer"))
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(header().exists("Permissions-Policy"));
	}

	@Test
	void recusaRequisicaoGrandeDemais() throws Exception {
		byte[] grande = new byte[1024 * 1024 + 10];
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(grande))
			.andExpect(status().isPayloadTooLarge());
	}

	@Test
	void recusaTokenDeOutroEmissor() throws Exception {
		Instant agora = Instant.now();
		String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
				JwtClaimsSet.builder().issuer("outro-sistema").subject("admin@greenagri.dev").issuedAt(agora)
					.expiresAt(agora.plusSeconds(600)).claim("perfil", "ADMIN").id(UUID.randomUUID().toString()).build()))
			.getTokenValue();
		mvc.perform(get("/api/fazendas").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
	}

	@Test
	void chaveDeDispositivoErradaNaoRevelaSeOCodigoExiste() throws Exception {
		String corpo = "{\"codigo\":\"%s\",\"leituras\":[{\"us\":30}]}";
		mvc.perform(post("/api/iot/telemetria").with(ip("10.4.0.1")).header("X-Device-Key", "x").contentType(MediaType.APPLICATION_JSON)
			.content(corpo.formatted("SOLO-T02"))).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/iot/telemetria").with(ip("10.4.0.1")).header("X-Device-Key", "x").contentType(MediaType.APPLICATION_JSON)
			.content(corpo.formatted("NAO-EXISTE"))).andExpect(status().isUnauthorized());
	}
}
