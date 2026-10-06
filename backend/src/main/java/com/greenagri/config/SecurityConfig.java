package com.greenagri.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.greenagri.auth.AuthService;
import com.greenagri.fazenda.FazendaFilter;
import com.greenagri.fazenda.FazendaRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

/**
 * API stateless: usuários autenticam com JWT (Bearer) e os dispositivos IoT
 * com a chave própria enviada no header {@code X-Device-Key}, validada no
 * serviço de telemetria. Ver docs/SEGURANCA.md.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	/** A API só devolve JSON: nada pode ser carregado, embutido em frame ou executado a partir dela. */
	private static final String CSP_API = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

	/** Console do H2, só em desenvolvimento: precisa de frames e scripts próprios. */
	@Bean
	@Order(1)
	@Profile("dev")
	SecurityFilterChain consoleH2(HttpSecurity http) throws Exception {
		http.securityMatcher("/h2-console/**")
			.csrf(AbstractHttpConfigurer::disable)
			.headers(h -> h.frameOptions(f -> f.sameOrigin()))
			.authorizeHttpRequests(a -> a.anyRequest().permitAll());
		return http.build();
	}

	@Bean
	@Order(2)
	SecurityFilterChain securityFilterChain(HttpSecurity http, FazendaRepository fazendas) throws Exception {
		http
			// Sem cookies de sessão (token no header Authorization), CSRF não se aplica.
			.csrf(AbstractHttpConfigurer::disable)
			.cors(Customizer.withDefaults())
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.headers(h -> h
				.frameOptions(f -> f.deny())
				.contentTypeOptions(Customizer.withDefaults())
				.referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
				.httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(Duration.ofDays(365).toSeconds()))
				.permissionsPolicyHeader(p -> p.policy("camera=(), microphone=(), geolocation=(), payment=()"))
				.addHeaderWriter((req, res) -> {
					// Swagger (só em dev) é HTML e precisa carregar os próprios recursos.
					if (!req.getRequestURI().startsWith("/swagger-ui") && !res.containsHeader("Content-Security-Policy")) {
						res.setHeader("Content-Security-Policy", CSP_API);
					}
					res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
					res.setHeader("Cache-Control", "no-store");
				}))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registro").permitAll()
				.requestMatchers(HttpMethod.POST, "/api/iot/telemetria").permitAll()
				.requestMatchers("/actuator/health", "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(o -> o.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
			.addFilterAfter(new FazendaFilter(fazendas), BearerTokenAuthenticationFilter.class);
		return http.build();
	}

	/** Custo 12 (~250 ms): encarece ataques offline contra um eventual vazamento de hashes. */
	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	@Bean
	SecretKey jwtSecretKey(GreenAgriProperties props, Environment env) {
		String segredo = props.jwt().secret();
		byte[] bytes = segredo == null ? new byte[0] : segredo.getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("GREENAGRI_JWT_SECRET precisa ter pelo menos 32 bytes aleatórios");
		}
		String s = segredo.toLowerCase(Locale.ROOT);
		if (!env.acceptsProfiles(Profiles.of("dev")) && (s.contains("dev") || s.contains("troque") || s.contains("secret") || s.contains("segredo"))) {
			throw new IllegalStateException("GREENAGRI_JWT_SECRET parece um valor de exemplo; gere um aleatório (ex.: openssl rand -base64 48)");
		}
		return new SecretKeySpec(bytes, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(SecretKey key) {
		return new NimbusJwtEncoder(new ImmutableSecret<>(key));
	}

	/** Valida assinatura, algoritmo fixo (HS256), validade (exp/nbf) e emissor. */
	@Bean
	JwtDecoder jwtDecoder(SecretKey key) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(Duration.ofSeconds(30)),
				new JwtIssuerValidator(AuthService.EMISSOR)));
		return decoder;
	}

	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthoritiesClaimName("perfil");
		authorities.setAuthorityPrefix("ROLE_");
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(GreenAgriProperties props) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(props.cors().origens());
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Device-Key", FazendaFilter.HEADER));
		config.setMaxAge(Duration.ofHours(1));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
