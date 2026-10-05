package com.greenagri.fazenda;

import java.util.Map;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

/**
 * Liga o Hibernate à fazenda selecionada. Entidades com {@code @TenantId} recebem o
 * {@code fazenda_id} ao serem gravadas e toda consulta é filtrada por ele, então um
 * repositório nunca devolve dados de outra fazenda sem precisar de filtro manual.
 */
@Component
public class FazendaTenantResolver implements CurrentTenantIdentifierResolver<Long>, HibernatePropertiesCustomizer {

	@Override
	public Long resolveCurrentTenantIdentifier() {
		return ContextoFazenda.atual();
	}

	@Override
	public boolean validateExistingCurrentSessions() {
		return false;
	}

	@Override
	public boolean isRoot(Long tenantId) {
		return ContextoFazenda.RAIZ.equals(tenantId);
	}

	@Override
	public void customize(Map<String, Object> props) {
		props.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
	}
}
