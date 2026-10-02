package com.greenagri.iot;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DispositivoRepository extends JpaRepository<Dispositivo, Long> {

	@EntityGraph(attributePaths = "produto")
	Optional<Dispositivo> findByCodigo(String codigo);

	boolean existsByCodigoIgnoreCase(String codigo);

	@EntityGraph(attributePaths = "produto")
	List<Dispositivo> findAllByOrderByCodigoAsc();
}
