package com.greenagri.seguranca;

import java.util.Locale;
import java.util.Set;

import com.greenagri.shared.RegraNegocioException;

/**
 * Política de senha (alinhada ao NIST SP 800-63B: comprimento mínimo e lista de
 * senhas comuns, sem exigir trocas periódicas ou símbolos obrigatórios).
 */
public final class PoliticaSenha {

	public static final int TAMANHO_MINIMO = 10;

	private static final Set<String> COMUNS = Set.of("1234567890", "12345678910", "0123456789", "senha12345", "senha123456",
			"password123", "qwertyuiop", "abcdefghij", "1qaz2wsx3edc", "greenagri123", "agricultura", "fazenda123",
			"brasil2026", "mudar12345", "admin12345");

	private PoliticaSenha() {
	}

	public static void validar(String senha, String email, String nome) {
		if (senha == null || senha.length() < TAMANHO_MINIMO) {
			throw new RegraNegocioException("A senha deve ter pelo menos " + TAMANHO_MINIMO + " caracteres");
		}
		if (senha.length() > 128) {
			throw new RegraNegocioException("A senha deve ter no máximo 128 caracteres");
		}
		if (senha.chars().noneMatch(Character::isLetter) || senha.chars().noneMatch(Character::isDigit)) {
			throw new RegraNegocioException("Use letras e números na senha");
		}
		String s = senha.toLowerCase(Locale.ROOT);
		if (COMUNS.contains(s) || s.chars().distinct().count() < 4) {
			throw new RegraNegocioException("Essa senha é muito comum. Escolha outra");
		}
		String usuario = email == null ? "" : email.split("@")[0].toLowerCase(Locale.ROOT);
		String primeiroNome = nome == null ? "" : nome.trim().split("\\s+")[0].toLowerCase(Locale.ROOT);
		if ((usuario.length() >= 4 && s.contains(usuario)) || (primeiroNome.length() >= 4 && s.contains(primeiroNome))) {
			throw new RegraNegocioException("A senha não pode conter seu nome ou e-mail");
		}
	}
}
