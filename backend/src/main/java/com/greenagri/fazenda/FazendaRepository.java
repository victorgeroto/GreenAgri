package com.greenagri.fazenda;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FazendaRepository extends JpaRepository<Fazenda, Long> {

	@Query("select f from Fazenda f join f.membros u where lower(u.email) = lower(:email) order by f.nome")
	List<Fazenda> doUsuario(String email);

	@Query("select count(f) > 0 from Fazenda f join f.membros u where f.id = :fazendaId and lower(u.email) = lower(:email)")
	boolean temAcesso(Long fazendaId, String email);
}
