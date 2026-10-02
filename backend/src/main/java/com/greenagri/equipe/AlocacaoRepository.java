package com.greenagri.equipe;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlocacaoRepository extends JpaRepository<Alocacao, Long> {

	@EntityGraph(attributePaths = { "operador", "veiculo", "talhao" })
	List<Alocacao> findByEncerradaEmIsNullOrderByInicioAsc();

	@EntityGraph(attributePaths = { "operador", "veiculo", "talhao" })
	List<Alocacao> findTop30ByOperadorIdOrderByInicioDesc(Long operadorId);

	boolean existsByOperadorIdAndEncerradaEmIsNull(Long operadorId);

	@EntityGraph(attributePaths = "operador")
	Optional<Alocacao> findFirstByVeiculoIdAndEncerradaEmIsNull(Long veiculoId);

	@EntityGraph(attributePaths = "operador")
	Optional<Alocacao> findFirstByOperadorIdAndEncerradaEmIsNull(Long operadorId);

	@EntityGraph(attributePaths = { "operador", "veiculo", "talhao" })
	Optional<Alocacao> findByIdCliente(String idCliente);
}
