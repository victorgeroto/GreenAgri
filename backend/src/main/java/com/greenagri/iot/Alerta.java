package com.greenagri.iot;

import java.time.Instant;

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
@Table(name = "alertas")
@Getter
@Setter
@NoArgsConstructor
public class Alerta {

	public enum Tipo {
		SOLO_SECO, GEADA, CALOR_EXTREMO, SILO_AQUECIMENTO, SILO_NIVEL_BAIXO, BATERIA_BAIXA
	}

	public enum Severidade {
		INFO, AVISO, CRITICO
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "dispositivo_id")
	private Dispositivo dispositivo;

	@Enumerated(EnumType.STRING)
	private Tipo tipo;

	@Enumerated(EnumType.STRING)
	private Severidade severidade;

	private String mensagem;

	private Double valor;

	private Instant criadoEm;

	private boolean reconhecido;
}
