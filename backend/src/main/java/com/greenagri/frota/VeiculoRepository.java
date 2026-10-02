package com.greenagri.frota;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface VeiculoRepository extends JpaRepository<Veiculo, Long> {

	List<Veiculo> findAllByOrderByIdentificacaoAsc();

	boolean existsByIdentificacaoIgnoreCase(String identificacao);

	boolean existsByIdentificacaoIgnoreCaseAndIdNot(String identificacao, Long id);

	long countByProximaManutencaoLessThanEqualAndStatusNot(LocalDate limite, StatusVeiculo status);

	long countByStatus(StatusVeiculo status);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select v from Veiculo v where v.id = :id")
	Optional<Veiculo> findComBloqueioById(Long id);
}
