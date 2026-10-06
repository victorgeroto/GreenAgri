package com.greenagri.seguranca;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Contador de tentativas por chave (ex.: e-mail + IP) com janela deslizante e bloqueio
 * temporário. Em memória: suficiente para uma instância; com várias réplicas, troque
 * por Redis ou pelo gateway/WAF.
 */
@Component
public class LimitadorTentativas {

	private record Janela(int tentativas, Instant inicio, Instant bloqueadoAte) {
	}

	private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();
	private final Clock relogio;

	public LimitadorTentativas() {
		this(Clock.systemUTC());
	}

	LimitadorTentativas(Clock relogio) {
		this.relogio = relogio;
	}

	/** Lança {@link MuitasTentativasException} enquanto a chave estiver bloqueada. */
	public void verificar(String chave) {
		Janela j = janelas.get(chave);
		Instant agora = relogio.instant();
		if (j != null && j.bloqueadoAte() != null && agora.isBefore(j.bloqueadoAte())) {
			throw new MuitasTentativasException(Duration.between(agora, j.bloqueadoAte()));
		}
	}

	/**
	 * Conta uma tentativa; ao atingir {@code limite} dentro da {@code janela}, bloqueia
	 * por {@code bloqueio}. Devolve true se a chave acabou de ser bloqueada.
	 */
	public boolean registrar(String chave, int limite, Duration janela, Duration bloqueio) {
		Instant agora = relogio.instant();
		Janela nova = janelas.compute(chave, (k, j) -> {
			if (j == null || agora.isAfter(j.inicio().plus(janela)) || (j.bloqueadoAte() != null && !agora.isBefore(j.bloqueadoAte()))) {
				j = new Janela(0, agora, null);
			}
			int tentativas = j.tentativas() + 1;
			return new Janela(tentativas, j.inicio(), tentativas >= limite ? agora.plus(bloqueio) : null);
		});
		return nova.bloqueadoAte() != null && nova.tentativas() == limite;
	}

	public void limpar(String chave) {
		janelas.remove(chave);
	}

	/** Remove janelas vencidas para a memória não crescer sem limite. */
	@Scheduled(fixedDelay = 600_000)
	void limparExpiradas() {
		Instant limite = relogio.instant().minus(Duration.ofHours(2));
		janelas.values().removeIf(j -> j.inicio().isBefore(limite) && (j.bloqueadoAte() == null || j.bloqueadoAte().isBefore(relogio.instant())));
	}
}
