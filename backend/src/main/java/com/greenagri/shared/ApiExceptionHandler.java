package com.greenagri.shared;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.greenagri.seguranca.MuitasTentativasException;

/** Converte exceções em respostas RFC 7807 (application/problem+json). */
@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(RecursoNaoEncontradoException.class)
	ProblemDetail naoEncontrado(RecursoNaoEncontradoException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(RegraNegocioException.class)
	ProblemDetail regraNegocio(RegraNegocioException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
	}

	@ExceptionHandler(MuitasTentativasException.class)
	ResponseEntity<ProblemDetail> muitasTentativas(MuitasTentativasException ex) {
		return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
			.header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.segundos()))
			.body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage()));
	}

	@ExceptionHandler(BadCredentialsException.class)
	ProblemDetail credenciais(BadCredentialsException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ProblemDetail integridade(DataIntegrityViolationException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
				"Registro conflita com dados existentes (valor duplicado ou referência inválida)");
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail validacao(MethodArgumentNotValidException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dados inválidos");
		Map<String, String> campos = new LinkedHashMap<>();
		ex.getBindingResult().getFieldErrors()
			.forEach(e -> campos.putIfAbsent(e.getField(), e.getDefaultMessage()));
		problem.setProperty("campos", campos);
		return problem;
	}

	/** Qualquer erro não tratado: registra o detalhe no servidor e responde sem expor internos. */
	@ExceptionHandler(Exception.class)
	ProblemDetail inesperado(Exception ex) throws Exception {
		if (ex instanceof org.springframework.web.ErrorResponse || ex instanceof org.springframework.security.access.AccessDeniedException
				|| ex instanceof org.springframework.security.core.AuthenticationException) {
			throw ex; // respostas padrão do Spring (404, 405, 403, 401...)
		}
		org.slf4j.LoggerFactory.getLogger(ApiExceptionHandler.class).error("Erro não tratado", ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno. Tente novamente mais tarde.");
	}
}
