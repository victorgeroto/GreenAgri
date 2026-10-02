package com.greenagri.colheita;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import com.greenagri.produto.Produto;
import com.greenagri.talhao.Talhao;

import org.hibernate.annotations.TenantId;

import jakarta.persistence.Column;
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
import lombok.AccessLevel;
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

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "talhao_id")
	private Talhao talhao;

	/** Ano-safra, ex.: "2025/26". */
	private String safra;

	private String cultura;

	private BigDecimal areaHa;

	private LocalDate dataPlantio;

	private LocalDate previsaoColheita;

	private LocalDate dataColheita;

	private BigDecimal producaoEstimadaKg;

	private BigDecimal producaoRealKg;

	/** Só muda pelo {@code ColheitaService}, que registra o evento correspondente. */
	@Enumerated(EnumType.STRING)
	@Setter(AccessLevel.PACKAGE)
	private StatusColheita status = StatusColheita.PLANEJADA;

	@Setter(AccessLevel.PACKAGE)
	private Instant statusDesde = Instant.now();

	/** Produto do estoque que recebe a produção quando a colheita é concluída. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "produto_id")
	private Produto produto;

	private String observacoes;
}
