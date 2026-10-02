package com.greenagri.talhao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TalhaoRepository extends JpaRepository<Talhao, Long> {

	List<Talhao> findAllByOrderByCodigoAsc();

	List<Talhao> findByGeometriaIsNotNull();

	Optional<Talhao> findByCodigoIgnoreCase(String codigo);

	boolean existsByCodigoIgnoreCase(String codigo);

	boolean existsByCodigoIgnoreCaseAndIdNot(String codigo, Long id);
}
