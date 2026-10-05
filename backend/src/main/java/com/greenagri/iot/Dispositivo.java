package com.greenagri.iot;

import java.math.BigDecimal;
import java.time.Instant;

import com.greenagri.frota.Veiculo;
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
@Table(name = "dispositivos")
@Getter
@Setter
@NoArgsConstructor
public class Dispositivo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Fazenda dona do registro: preenchida na gravação e aplicada como filtro em toda consulta. */
	@TenantId
	@Column(name = "fazenda_id", nullable = false, updatable = false)
	private Long fazendaId;

	/** Identificador gravado no firmware (ex.: SILO-01). */
	private String codigo;

	private String nome;

	@Enumerated(EnumType.STRING)
	private TipoDispositivo tipo;

	private String localizacao;

	private Double latitude;

	private Double longitude;

	/** SHA-256 da chave do dispositivo; a chave em texto só é exibida no provisionamento. */
	private String apiKeyHash;

	private String firmwareVersao;

	private Instant ultimoContato;

	private Double bateria;

	/** Para silos: produto do estoque armazenado, usado na reconciliação medido × registrado. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "produto_id")
	private Produto produto;

	private BigDecimal capacidadeKg;

	/** Para rastreadores: máquina onde o dispositivo está instalado. */
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "veiculo_id")
	private Veiculo veiculo;
}
