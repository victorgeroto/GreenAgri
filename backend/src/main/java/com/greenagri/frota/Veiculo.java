package com.greenagri.frota;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.TenantId;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "veiculos")
@Getter
@Setter
@NoArgsConstructor
public class Veiculo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	/** Placa ou número de patrimônio. */
	private String identificacao;

	private String modelo;

	@Enumerated(EnumType.STRING)
	private TipoVeiculo tipo;

	private Integer ano;

	/** Horas de motor (máquinas) ou km (veículos de estrada). */
	private BigDecimal horimetro = BigDecimal.ZERO;

	@Enumerated(EnumType.STRING)
	private StatusVeiculo status = StatusVeiculo.DISPONIVEL;

	private LocalDate proximaManutencao;

	private String observacoes;
}
