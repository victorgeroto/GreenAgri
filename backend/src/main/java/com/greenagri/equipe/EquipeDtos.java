package com.greenagri.equipe;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import com.greenagri.frota.TipoVeiculo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class EquipeDtos {

	private EquipeDtos() {
	}

	public record OperadorRequest(
			@NotBlank @Size(max = 20) String matricula,
			@NotBlank @Size(max = 120) String nome,
			@NotNull Funcao funcao,
			@NotNull Turno turno,
			@Size(max = 5) String cnhCategoria,
			Set<TipoVeiculo> habilitacoes) {
	}

	public record AlocacaoRequest(
			@NotNull Long operadorId,
			@NotNull TipoAtividade atividade,
			Long veiculoId,
			Long talhaoId,
			@Size(max = 255) String descricao,
			Instant previsaoFim,
			@Pattern(regexp = "^[0-9a-fA-F-]{36}$", message = "idCliente deve ser um UUID") String idCliente) {
	}

	public record AlocacaoResponse(
			Long id, Long operadorId, String operadorNome, TipoAtividade atividade, Long veiculoId,
			String veiculoIdentificacao, String veiculoModelo, TipoVeiculo veiculoTipo, Long talhaoId,
			String talhaoCodigo, String descricao, Instant inicio, Instant previsaoFim, Instant encerradaEm,
			String responsavel, String idCliente) {

		public static AlocacaoResponse de(Alocacao a) {
			var v = a.getVeiculo();
			var t = a.getTalhao();
			return new AlocacaoResponse(a.getId(), a.getOperador().getId(), a.getOperador().getNome(), a.getAtividade(),
					v == null ? null : v.getId(), v == null ? null : v.getIdentificacao(),
					v == null ? null : v.getModelo(), v == null ? null : v.getTipo(), t == null ? null : t.getId(),
					t == null ? null : t.getCodigo(), a.getDescricao(), a.getInicio(), a.getPrevisaoFim(),
					a.getEncerradaEm(), a.getResponsavel(), a.getIdCliente());
		}
	}

	public record OperadorResponse(
			Long id, String matricula, String nome, Funcao funcao, Turno turno, String cnhCategoria,
			List<TipoVeiculo> habilitacoes, Situacao situacao, LocalDate ausenteAte, String motivoAusencia,
			AlocacaoResponse alocacaoAtual) {
	}
}
