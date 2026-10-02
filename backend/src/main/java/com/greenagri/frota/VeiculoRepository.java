package com.greenagri.frota;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {

	List<Veiculo> findAllByOrderByIdentificacaoAsc();

	boolean existsByIdentificacaoIgnoreCase(String identificacao);

	boolean existsByIdentificacaoIgnoreCaseAndIdNot(String identificacao, Long id);

	long countByProximaManutencaoLessThanEqualAndStatusNot(LocalDate limite, StatusVeiculo status);

	long countByStatus(StatusVeiculo status);
}
