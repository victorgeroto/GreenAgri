package com.greenagri.fazenda;

import java.util.function.Supplier;

/**
 * Fazenda selecionada na requisição atual. Definida pelo {@link FazendaFilter} a partir
 * do header {@code X-Fazenda-Id}; sem valor, o Hibernate opera em modo raiz (sem filtro),
 * usado por login, ingestão de telemetria antes de identificar o dispositivo e carga inicial.
 */
public final class ContextoFazenda {

	/** Valor do tenant "raiz" no Hibernate: enxerga e grava em todas as fazendas. */
	public static final Long RAIZ = 0L;

	private static final ThreadLocal<Long> ATUAL = new ThreadLocal<>();

	private ContextoFazenda() {
	}

	public static Long atual() {
		Long id = ATUAL.get();
		return id == null ? RAIZ : id;
	}

	public static <T> T executar(Long fazendaId, Supplier<T> tarefa) {
		Long anterior = ATUAL.get();
		ATUAL.set(fazendaId);
		try {
			return tarefa.get();
		}
		finally {
			if (anterior == null) {
				ATUAL.remove();
			}
			else {
				ATUAL.set(anterior);
			}
		}
	}

	/** Para o filtro HTTP, que precisa propagar IOException/ServletException. */
	static void entrar(Long fazendaId) {
		ATUAL.set(fazendaId);
	}

	static void sair() {
		ATUAL.remove();
	}

	public static void executar(Long fazendaId, Runnable tarefa) {
		executar(fazendaId, () -> {
			tarefa.run();
			return null;
		});
	}
}
