package com.greenagri.iot;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Geração e verificação das chaves de autenticação dos dispositivos de campo. */
public final class ChaveDispositivo {

	private static final SecureRandom RANDOM = new SecureRandom();

	private ChaveDispositivo() {
	}

	public static String gerar() {
		byte[] bytes = new byte[24];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	public static String hash(String chave) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(chave.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

	/** Comparação em tempo constante para não vazar informação por timing. */
	public static boolean confere(String chave, String hashEsperado) {
		if (chave == null || hashEsperado == null) {
			return false;
		}
		return MessageDigest.isEqual(hash(chave).getBytes(StandardCharsets.US_ASCII),
				hashEsperado.getBytes(StandardCharsets.US_ASCII));
	}
}
