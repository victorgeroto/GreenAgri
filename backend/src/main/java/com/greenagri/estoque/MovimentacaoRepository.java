package com.greenagri.estoque;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MovimentacaoRepository extends JpaRepository<Movimentacao, Long> {

	@EntityGraph(attributePaths = "produto")
	Optional<Movimentacao> findByIdCliente(String idCliente);

	@EntityGraph(attributePaths = "produto")
	@Query("""
			select m from Movimentacao m
			where (:produtoId is null or m.produto.id = :produtoId)
			order by m.ocorridoEm desc, m.id desc
			""")
	List<Movimentacao> listar(@Param("produtoId") Long produtoId, Pageable pageable);

	long countByOcorridoEmAfter(Instant desde);
}
