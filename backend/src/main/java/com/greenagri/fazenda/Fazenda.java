package com.greenagri.fazenda;

import java.util.HashSet;
import java.util.Set;

import com.greenagri.auth.Usuario;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Unidade de isolamento dos dados: cada propriedade tem estoque, talhões, frota e equipe próprios. */
@Entity
@Table(name = "fazendas")
@Getter
@Setter
@NoArgsConstructor
public class Fazenda {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String nome;

	private String municipio;

	/** Sigla do estado (PR, GO, MT...). */
	private String uf;

	/** Referência da sede, usada para centralizar o mapa quando ainda não há talhões. */
	private Double latitude;

	private Double longitude;

	@ManyToMany
	@JoinTable(name = "usuario_fazendas", joinColumns = @JoinColumn(name = "fazenda_id"),
			inverseJoinColumns = @JoinColumn(name = "usuario_id"))
	private Set<Usuario> membros = new HashSet<>();
}
