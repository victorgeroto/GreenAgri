package com.greenagri.seed;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

/**
 * Credenciais dos dados de demonstração, sem nada fixo no repositório: a senha dos
 * usuários e as chaves dos dispositivos são geradas aleatoriamente na primeira
 * execução e gravadas num arquivo local ignorado pelo Git (padrão
 * {@code .greenagri-demo/credenciais.json} na raiz do projeto), reaproveitado nas
 * execuções seguintes. {@code GREENAGRI_DEMO_SENHA} fixa a senha, se preferir.
 */
@Component
@ConditionalOnProperty(name = "greenagri.seed.enabled", havingValue = "true")
class CredenciaisDemo {

	private static final SecureRandom RANDOM = new SecureRandom();
	private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

	record Arquivo(String aviso, String senha, List<String> usuarios, Map<String, String> dispositivos) {
	}

	private final ObjectMapper mapper;
	private final Path caminho;
	private final String prefixoChave;
	private final String senha;
	private final Map<String, String> chaves;

	CredenciaisDemo(ObjectMapper mapper,
			@Value("${greenagri.seed.arquivo-credenciais:../.greenagri-demo/credenciais.json}") String caminho,
			@Value("${greenagri.seed.senha:}") String senhaFixa,
			@Value("${greenagri.seed.prefixo-chave:}") String prefixoChave) {
		this.mapper = mapper;
		// String (e não Path): o conversor do Spring trataria "../" como recurso do classpath.
		this.caminho = Path.of(caminho).toAbsolutePath().normalize();
		this.prefixoChave = prefixoChave;
		Arquivo salvo = ler();
		this.senha = !senhaFixa.isBlank() ? senhaFixa : salvo != null && salvo.senha() != null ? salvo.senha() : gerar(16);
		this.chaves = new LinkedHashMap<>(salvo != null && salvo.dispositivos() != null ? salvo.dispositivos() : Map.of());
	}

	String senha() {
		return senha;
	}

	/** Chave do dispositivo; com {@code greenagri.seed.prefixo-chave} (testes) é determinística. */
	String chave(String codigo) {
		if (!prefixoChave.isBlank()) {
			return prefixoChave + codigo.toLowerCase();
		}
		return chaves.computeIfAbsent(codigo, c -> gerar(32));
	}

	Path caminho() {
		return caminho;
	}

	void salvar(List<String> emails) {
		try {
			Files.createDirectories(caminho.getParent());
			mapper.copy().enable(SerializationFeature.INDENT_OUTPUT).writeValue(caminho.toFile(), new Arquivo(
					"Credenciais LOCAIS de demonstração. Não versione nem compartilhe; não use em produção.", senha,
					emails, chaves));
			try {
				Files.setPosixFilePermissions(caminho, PosixFilePermissions.fromString("rw-------"));
			}
			catch (UnsupportedOperationException e) {
				// Windows: o arquivo herda as permissões da pasta do usuário.
			}
		}
		catch (IOException e) {
			throw new UncheckedIOException("Não foi possível gravar " + caminho, e);
		}
	}

	private Arquivo ler() {
		if (!Files.exists(caminho)) {
			return null;
		}
		try {
			return mapper.readValue(caminho.toFile(), Arquivo.class);
		}
		catch (IOException e) {
			return null; // arquivo corrompido: gera novas credenciais
		}
	}

	/** Letras e números sem caracteres ambíguos; sempre com ao menos uma letra e um dígito. */
	static String gerar(int tamanho) {
		while (true) {
			StringBuilder sb = new StringBuilder(tamanho);
			for (int i = 0; i < tamanho; i++) {
				sb.append(ALFABETO.charAt(RANDOM.nextInt(ALFABETO.length())));
			}
			String s = sb.toString();
			if (s.chars().anyMatch(Character::isDigit) && s.chars().anyMatch(Character::isLetter)) {
				return s;
			}
		}
	}
}
