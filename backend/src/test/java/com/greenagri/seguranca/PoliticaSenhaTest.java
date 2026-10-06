package com.greenagri.seguranca;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.greenagri.shared.RegraNegocioException;

class PoliticaSenhaTest {

	@Test
	void aceitaSenhaLongaComLetrasENumeros() {
		assertThatCode(() -> PoliticaSenha.validar("Ipe-Amarelo-77", "ana@fazenda.com", "Ana Paula")).doesNotThrowAnyException();
	}

	@Test
	void recusaCurtaComumRepetitivaSemNumeroOuComDadosDoUsuario() {
		assertThatThrownBy(() -> PoliticaSenha.validar("abc12", "a@b.com", "X")).isInstanceOf(RegraNegocioException.class);
		assertThatThrownBy(() -> PoliticaSenha.validar("greenagri123", "a@b.com", "X")).hasMessageContaining("comum");
		assertThatThrownBy(() -> PoliticaSenha.validar("1111111111a", "a@b.com", "X")).hasMessageContaining("comum");
		assertThatThrownBy(() -> PoliticaSenha.validar("somenteletras", "a@b.com", "X")).hasMessageContaining("letras e números");
		assertThatThrownBy(() -> PoliticaSenha.validar("joaosilva2026", "joaosilva@b.com", "João")).hasMessageContaining("nome ou e-mail");
	}

	@Test
	void limitadorBloqueiaEDesbloqueiaComOTempo() {
		var relogio = new Clock() {
			Instant agora = Instant.parse("2026-01-01T10:00:00Z");

			@Override
			public Instant instant() {
				return agora;
			}

			@Override
			public java.time.ZoneId getZone() {
				return ZoneOffset.UTC;
			}

			@Override
			public Clock withZone(java.time.ZoneId zone) {
				return this;
			}
		};
		LimitadorTentativas l = new LimitadorTentativas(relogio);
		for (int i = 0; i < 3; i++) {
			l.registrar("k", 3, Duration.ofMinutes(15), Duration.ofMinutes(15));
		}
		assertThatThrownBy(() -> l.verificar("k")).isInstanceOf(MuitasTentativasException.class);
		relogio.agora = relogio.agora.plus(Duration.ofMinutes(16));
		assertThatCode(() -> l.verificar("k")).doesNotThrowAnyException();
	}
}
