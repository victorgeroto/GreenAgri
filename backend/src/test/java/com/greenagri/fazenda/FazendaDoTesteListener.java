package com.greenagri.fazenda;

import org.springframework.core.Ordered;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.TestExecutionListener;

import com.greenagri.Acesso;

/**
 * Em testes {@code @Transactional} a transação (e a sessão do Hibernate, que fixa a
 * fazenda) abre antes da requisição passar pelo {@link FazendaFilter}. Este listener
 * seleciona a Santa Helena antes disso; roda antes do TransactionalTestExecutionListener
 * (ordem 4000). Testes que comparam fazendas diferentes não usam {@code @Transactional}.
 */
public class FazendaDoTesteListener implements TestExecutionListener, Ordered {

	@Override
	public void beforeTestMethod(TestContext testContext) {
		ContextoFazenda.entrar(Acesso.SANTA_HELENA);
	}

	@Override
	public void afterTestMethod(TestContext testContext) {
		ContextoFazenda.sair();
	}

	@Override
	public int getOrder() {
		return 3_900;
	}
}
