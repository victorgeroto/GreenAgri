package com.greenagri.equipe;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

import com.greenagri.frota.TipoVeiculo;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "operadores")
@Getter
@Setter
@NoArgsConstructor
public class Operador {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String matricula;

	private String nome;

	@Enumerated(EnumType.STRING)
	private Funcao funcao;

	@Enumerated(EnumType.STRING)
	private Turno turno;

	private String cnhCategoria;

	/** Tipos de máquina que o operador tem treinamento para operar. */
	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "operador_habilitacoes", joinColumns = @JoinColumn(name = "operador_id"))
	@Column(name = "tipo_veiculo")
	@Enumerated(EnumType.STRING)
	private Set<TipoVeiculo> habilitacoes = EnumSet.noneOf(TipoVeiculo.class);

	/** Férias, atestado, folga: indisponível até esta data (inclusive). */
	private LocalDate ausenteAte;

	private String motivoAusencia;

	private boolean ativo = true;

	public boolean ausenteEm(LocalDate dia) {
		return ausenteAte != null && !dia.isAfter(ausenteAte);
	}

	public boolean habilitadoPara(TipoVeiculo tipo) {
		// Implementos são puxados pelo trator: quem opera trator opera o implemento.
		return habilitacoes.contains(tipo) || (tipo == TipoVeiculo.IMPLEMENTO && habilitacoes.contains(TipoVeiculo.TRATOR));
	}
}
