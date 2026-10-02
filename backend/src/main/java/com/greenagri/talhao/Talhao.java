package com.greenagri.talhao;

import java.math.BigDecimal;

import org.hibernate.annotations.TenantId;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "talhoes")
@Getter
@Setter
@NoArgsConstructor
public class Talhao {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	private String codigo;

	private String nome;

	/** Polígono em GeoJSON; nulo para talhões ainda não desenhados no mapa. */
	private String geometria;

	/** Calculada a partir do polígono. */
	private BigDecimal areaHa;

	/** Centróide do polígono. */
	private Double latitude;

	private Double longitude;
}
