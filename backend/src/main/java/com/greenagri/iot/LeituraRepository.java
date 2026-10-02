package com.greenagri.iot;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LeituraRepository extends JpaRepository<Leitura, Long> {

	Optional<Leitura> findFirstByDispositivoIdOrderByMedidoEmDesc(Long dispositivoId);

	List<Leitura> findByDispositivoIdAndMedidoEmAfterOrderByMedidoEmAsc(Long dispositivoId, Instant desde);

	@Query("select l.medidoEm from Leitura l where l.dispositivo.id = :id and l.medidoEm in :instantes")
	List<Instant> instantesJaRecebidos(@Param("id") Long dispositivoId,
			@Param("instantes") Collection<Instant> instantes);
}
