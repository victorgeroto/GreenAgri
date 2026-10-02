package com.greenagri.colheita;

import java.time.Instant;

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

/** Uma mudança de status da colheita, com quem/o que a provocou e onde. */
@Entity
@Table(name = "colheita_eventos")
@Getter
@Setter
@NoArgsConstructor
public class ColheitaEvento {

	public enum Origem {
		/** Usuário no app. */
		MANUAL,
		/** Dispositivo de campo (ex.: rastreador da colheitadeira entrou operando no talhão). */
		DISPOSITIVO
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "colheita_id")
	private Colheita colheita;

	@Enumerated(EnumType.STRING)
	private StatusColheita statusAnterior;

	@Enumerated(EnumType.STRING)
	private StatusColheita statusNovo;

	@Enumerated(EnumType.STRING)
	private Origem origem;

	private String responsavel;

	private String observacao;

	private Double latitude;

	private Double longitude;

	private Instant ocorridoEm;
}
