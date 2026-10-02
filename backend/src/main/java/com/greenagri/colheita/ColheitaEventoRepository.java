package com.greenagri.colheita;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ColheitaEventoRepository extends JpaRepository<ColheitaEvento, Long> {

	List<ColheitaEvento> findByColheitaIdOrderByOcorridoEmAscIdAsc(Long colheitaId);
}
