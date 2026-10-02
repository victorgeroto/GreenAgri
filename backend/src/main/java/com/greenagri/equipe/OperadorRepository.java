package com.greenagri.equipe;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface OperadorRepository extends JpaRepository<Operador, Long> {

	List<Operador> findByAtivoTrueOrderByNomeAsc();

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select o from Operador o where o.id = :id")
	Optional<Operador> findComBloqueioById(Long id);
}
