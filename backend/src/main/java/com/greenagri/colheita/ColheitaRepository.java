package com.greenagri.colheita;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColheitaRepository extends JpaRepository<Colheita, Long> {

	@Override
	@EntityGraph(attributePaths = "produto")
	Optional<Colheita> findById(Long id);

	@EntityGraph(attributePaths = "produto")
	List<Colheita> findAllByOrderByPrevisaoColheitaAsc();

	long countByStatusNot(StatusColheita status);
}
