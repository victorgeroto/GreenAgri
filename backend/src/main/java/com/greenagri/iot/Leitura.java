package com.greenagri.iot;

import java.time.Instant;

import org.hibernate.annotations.TenantId;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "leituras")
@Getter
@Setter
@NoArgsConstructor
public class Leitura {

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

	/** Instante da medição no dispositivo (o envio pode acontecer horas depois). */
	private Instant medidoEm;

	private Instant recebidoEm;

	private Double temperatura;

	private Double umidadeAr;

	private Double umidadeSolo;

	private Double nivelPercentual;

	private Double bateria;

	private Integer rssi;

	private Double latitude;

	private Double longitude;

	/** km/h */
	private Double velocidade;

	/** Implemento em operação (ex.: plataforma de corte ligada). */
	private Boolean operando;
}
