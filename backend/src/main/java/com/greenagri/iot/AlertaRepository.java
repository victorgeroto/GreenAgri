package com.greenagri.iot;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertaRepository extends JpaRepository<Alerta, Long> {

	@EntityGraph(attributePaths = "dispositivo")
	List<Alerta> findTop100ByReconhecidoOrderByCriadoEmDesc(boolean reconhecido);

	boolean existsByDispositivoIdAndTipoAndReconhecidoFalseAndCriadoEmAfter(Long dispositivoId, Alerta.Tipo tipo,
			Instant desde);

	long countByReconhecidoFalse();
}
