package com.greenagri.fazenda;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.greenagri.seguranca.Auditoria;

import lombok.RequiredArgsConstructor;

/**
 * Seleciona a fazenda da requisição pelo header {@code X-Fazenda-Id}, depois da
 * autenticação JWT, e só deixa passar quem é membro dela. Login, cadastro de
 * fazendas e a telemetria dos dispositivos não dependem de fazenda selecionada.
 */
@RequiredArgsConstructor
public class FazendaFilter extends OncePerRequestFilter {

	public static final String HEADER = "X-Fazenda-Id";

	private final FazendaRepository fazendas;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String path = request.getRequestURI();
		return !path.startsWith("/api/") || path.startsWith("/api/auth/") || path.equals("/api/fazendas")
				|| path.startsWith("/api/fazendas/") || path.equals("/api/conta") || path.startsWith("/api/conta/")
				|| path.equals("/api/iot/telemetria");
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken jwt)) {
			chain.doFilter(request, response); // sem token: o Spring Security responde 401
			return;
		}
		Long fazendaId;
		try {
			fazendaId = Long.valueOf(request.getHeader(HEADER));
		}
		catch (NumberFormatException e) {
			erro(response, HttpStatus.BAD_REQUEST, "Selecione a fazenda (header " + HEADER + ")");
			return;
		}
		if (!fazendas.temAcesso(fazendaId, jwt.getName())) {
			Auditoria.alerta("ACESSO_FAZENDA_NEGADO", jwt.getName(), request.getRemoteAddr(), "fazenda=" + fazendaId);
			erro(response, HttpStatus.FORBIDDEN, "Você não tem acesso a esta fazenda");
			return;
		}
		ContextoFazenda.entrar(fazendaId);
		try {
			chain.doFilter(request, response);
		}
		finally {
			ContextoFazenda.sair();
		}
	}

	private static void erro(HttpServletResponse response, HttpStatus status, String detalhe) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("{\"title\":\"%s\",\"status\":%d,\"detail\":\"%s\"}"
			.formatted(status.getReasonPhrase(), status.value(), detalhe));
	}
}
