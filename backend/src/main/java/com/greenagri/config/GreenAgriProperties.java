package com.greenagri.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "greenagri")
public record GreenAgriProperties(Jwt jwt, Cors cors, Iot iot) {

	public record Jwt(String secret, long expiracaoHoras) {
	}

	public record Cors(List<String> origens) {
	}

	public record Iot(long minutosOffline) {
	}
}
