package com.greenagri.colheita;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.greenagri.produto.Produto;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "colheitas")
@Getter
@Setter
@NoArgsConstructor
public class Colheita {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String talhao;

	private String cultura;

	private BigDecimal areaHa;

	private LocalDate dataPlantio;

	private LocalDate previsaoColheita;

	private LocalDate dataColheita;

	private BigDecimal producaoEstimadaKg;

	private BigDecimal producaoRealKg;

	@Enumerated(EnumType.STRING)
	private StatusColheita status = StatusColheita.PLANEJADA;

	/** Produto do estoque que recebe a produção quando a colheita é concluída. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "produto_id")
	private Produto produto;

	private String observacoes;
}
