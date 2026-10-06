package com.greenagri.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "greenagri")
public record GreenAgriProperties(Jwt jwt, Cors cors, Iot iot, Seguranca seguranca) {

	public record Jwt(String secret, long expiracaoHoras) {
	}

	public record Cors(List<String> origens) {
	}

	public record Iot(long minutosOffline) {
	}

	/** Limites contra abuso (força bruta, criação em massa de contas, payloads grandes). */
	public record Seguranca(int tentativasLogin, int bloqueioMinutos, int cadastrosPorHora, int tamanhoMaximoKb) {
	}
}
