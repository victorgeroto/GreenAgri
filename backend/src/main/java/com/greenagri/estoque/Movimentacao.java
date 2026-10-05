package com.greenagri.estoque;

import java.math.BigDecimal;
import java.time.Instant;

import com.greenagri.produto.Produto;

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
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "movimentacoes_estoque")
@Getter
@Setter
@NoArgsConstructor
public class Movimentacao {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "produto_id")
	private Produto produto;

	@Enumerated(EnumType.STRING)
	private TipoMovimentacao tipo;

	private BigDecimal quantidade;

	private BigDecimal saldoApos;

	private String motivo;

	private String responsavel;

	/** UUID gerado pelo cliente; torna o reenvio da fila offline idempotente. */
	private String idCliente;

	/** Foto do lançamento (data URL JPEG reduzida no app). */
	private String foto;

	/** Quando aconteceu no campo (pode ser anterior ao registro, se feito offline). */
	private Instant ocorridoEm;

	private Instant registradoEm;
}
