package com.greenagri.colheita;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ColheitaRepository extends JpaRepository<Colheita, Long> {

	@Override
	@EntityGraph(attributePaths = { "produto", "talhao" })
	Optional<Colheita> findById(Long id);

	@EntityGraph(attributePaths = { "produto", "talhao" })
	List<Colheita> findAllByOrderByPrevisaoColheitaAsc();

	@EntityGraph(attributePaths = { "produto", "talhao" })
	List<Colheita> findBySafraOrderByPrevisaoColheitaAsc(String safra);

	@EntityGraph(attributePaths = { "produto", "talhao" })
	List<Colheita> findByTalhaoIdAndStatusIn(Long talhaoId, Collection<StatusColheita> status);

	@Query("select distinct c.safra from Colheita c order by c.safra desc")
	List<String> safras();

	long countByStatusNot(StatusColheita status);
}
