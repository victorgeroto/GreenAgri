package com.greenagri.seguranca;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.greenagri.config.GreenAgriProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Recusa corpos acima do limite (413) antes de qualquer processamento: evita abuso de memória. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LimiteTamanhoFilter extends OncePerRequestFilter {

	private final long maximoBytes;

	public LimiteTamanhoFilter(GreenAgriProperties props) {
		this.maximoBytes = props.seguranca().tamanhoMaximoKb() * 1024L;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		long tamanho = request.getContentLengthLong();
		boolean semTamanho = tamanho < 0 && request.getHeader("Transfer-Encoding") != null;
		if (tamanho > maximoBytes || semTamanho) {
			response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
			response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
			response.getWriter().write("{\"title\":\"Payload Too Large\",\"status\":413,\"detail\":\"Requisição maior que o permitido\"}");
			return;
		}
		chain.doFilter(request, response);
	}
}
