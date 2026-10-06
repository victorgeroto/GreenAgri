package com.greenagri.seguranca;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Log dedicado a eventos de segurança (logger {@code greenagri.seguranca}), para ser
 * enviado a um SIEM ou alertas. Nunca registra senhas, tokens ou chaves; e-mails
 * entram mascarados (LGPD: minimização).
 */
public final class Auditoria {

	private static final Logger LOG = LoggerFactory.getLogger("greenagri.seguranca");

	private Auditoria() {
	}

	public static void evento(String tipo, String email, String ip, String detalhe) {
		LOG.info("evento={} usuario={} ip={} {}", tipo, mascarar(email), ip, detalhe == null ? "" : detalhe);
	}

	public static void alerta(String tipo, String email, String ip, String detalhe) {
		LOG.warn("evento={} usuario={} ip={} {}", tipo, mascarar(email), ip, detalhe == null ? "" : detalhe);
	}

	/** joao.silva@fazenda.com → jo***@fazenda.com */
	static String mascarar(String email) {
		if (email == null || !email.contains("@")) {
			return "-";
		}
		String[] partes = email.split("@", 2);
		String nome = partes[0];
		return (nome.length() <= 2 ? nome.charAt(0) : nome.substring(0, 2)) + "***@" + partes[1];
	}
}
