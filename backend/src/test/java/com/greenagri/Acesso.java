package com.greenagri;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import org.springframework.test.web.servlet.request.RequestPostProcessor;

import com.greenagri.fazenda.FazendaFilter;

/**
 * Usuários dos dados de demonstração para os testes MockMvc: token JWT + fazenda
 * selecionada (header X-Fazenda-Id), como o app envia em cada requisição.
 */
public final class Acesso {

	/** Ordem de criação em seed/fazendas.json. */
	public static final long SANTA_HELENA = 1L;
	public static final long BOA_VISTA = 2L;

	private Acesso() {
	}

	/** Perfil OPERADOR, membro só da Santa Helena. */
	public static RequestPostProcessor operador() {
		return como("operador@greenagri.dev", "Operador de Campo", "OPERADOR", SANTA_HELENA);
	}

	/** Perfil ADMIN, membro das duas fazendas. */
	public static RequestPostProcessor admin(long fazendaId) {
		return como("admin@greenagri.dev", "Administrador GreenAgri", "ADMIN", fazendaId);
	}

	public static RequestPostProcessor como(String email, String nome, String perfil, Long fazendaId) {
		RequestPostProcessor token = jwt().jwt(j -> j.subject(email).claim("nome", nome).claim("perfil", perfil));
		return request -> {
			var r = token.postProcessRequest(request);
			if (fazendaId != null) {
				r.addHeader(FazendaFilter.HEADER, String.valueOf(fazendaId));
			}
			return r;
		};
	}
}
