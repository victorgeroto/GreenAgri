package com.greenagri.equipe;

import java.time.Instant;

import com.greenagri.frota.Veiculo;
import com.greenagri.talhao.Talhao;

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

/** Um operador designado para uma atividade, opcionalmente numa máquina e/ou num talhão. */
@Entity
@Table(name = "alocacoes")
@Getter
@Setter
@NoArgsConstructor
public class Alocacao {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "operador_id")
	private Operador operador;

	@Enumerated(EnumType.STRING)
	private TipoAtividade atividade;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "veiculo_id")
	private Veiculo veiculo;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "talhao_id")
	private Talhao talhao;

	private String descricao;

	private Instant inicio;

	private Instant previsaoFim;

	/** Nula enquanto a atividade está em andamento. */
	private Instant encerradaEm;

	private String responsavel;

	/** UUID gerado no app; torna seguro o reenvio da fila offline. */
	private String idCliente;

	public boolean emAndamento() {
		return encerradaEm == null;
	}
}
