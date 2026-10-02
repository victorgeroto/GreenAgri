package com.greenagri.produto;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {

	boolean existsBySkuIgnoreCase(String sku);

	boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

	/** Bloqueia a linha para serializar movimentações concorrentes do mesmo produto. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select p from Produto p where p.id = :id")
	Optional<Produto> findByIdParaAtualizar(@Param("id") Long id);

	@Query("""
			select p from Produto p
			where (:categoria is null or p.categoria = :categoria)
			  and (:termo is null or lower(p.nome) like :termo or lower(p.sku) like :termo)
			order by p.nome
			""")
	List<Produto> buscar(@Param("termo") String termo, @Param("categoria") Categoria categoria);

	@Query("select p from Produto p where p.quantidadeAtual < p.estoqueMinimo order by p.nome")
	List<Produto> findAbaixoDoMinimo();
}
