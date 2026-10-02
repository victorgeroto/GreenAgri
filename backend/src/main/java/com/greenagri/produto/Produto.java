package com.greenagri.produto;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "produtos")
@Getter
@Setter
@NoArgsConstructor
public class Produto {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String sku;

	private String nome;

	@Enumerated(EnumType.STRING)
	private Categoria categoria;

	@Enumerated(EnumType.STRING)
	private Unidade unidade;

	/** Saldo atual; só é alterado pelo {@code EstoqueService} ao registrar movimentações. */
	@Setter(lombok.AccessLevel.NONE)
	private BigDecimal quantidadeAtual = BigDecimal.ZERO;

	private BigDecimal estoqueMinimo = BigDecimal.ZERO;

	private String localizacao;

	private String descricao;

	/** Caminho público (/img/...) ou data URL JPEG gerada pelo app. */
	private String imagem;

	private Instant atualizadoEm;

	public boolean abaixoDoMinimo() {
		return quantidadeAtual.compareTo(estoqueMinimo) < 0;
	}

	public void atualizarSaldo(BigDecimal novoSaldo) {
		this.quantidadeAtual = novoSaldo;
	}

	@PrePersist
	@PreUpdate
	void tocar() {
		atualizadoEm = Instant.now();
	}
}
