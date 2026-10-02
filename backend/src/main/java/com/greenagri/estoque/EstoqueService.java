package com.greenagri.estoque;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.produto.Produto;
import com.greenagri.produto.ProdutoRepository;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueService {

	private final ProdutoRepository produtos;
	private final MovimentacaoRepository movimentacoes;

	/**
	 * Registra uma movimentação e atualiza o saldo do produto na mesma transação.
	 * Se {@code idCliente} já foi processado, devolve a movimentação existente
	 * (reenvio da fila offline não duplica lançamentos).
	 */
	@Transactional
	public Movimentacao registrar(Long produtoId, TipoMovimentacao tipo, BigDecimal quantidade, String motivo,
			String responsavel, String idCliente, Instant ocorridoEm) {
		if (idCliente != null) {
			Optional<Movimentacao> existente = movimentacoes.findByIdCliente(idCliente);
			if (existente.isPresent()) {
				return existente.get();
			}
		}
		if (tipo != TipoMovimentacao.AJUSTE && quantidade.signum() <= 0) {
			throw new RegraNegocioException("A quantidade deve ser maior que zero");
		}

		Produto produto = produtos.findByIdParaAtualizar(produtoId)
			.orElseThrow(() -> new RecursoNaoEncontradoException("Produto", produtoId));
		BigDecimal saldoAtual = produto.getQuantidadeAtual();
		BigDecimal novoSaldo = switch (tipo) {
			case ENTRADA -> saldoAtual.add(quantidade);
			case SAIDA -> saldoAtual.subtract(quantidade);
			case AJUSTE -> quantidade;
		};
		if (novoSaldo.signum() < 0) {
			throw new RegraNegocioException("Saldo insuficiente de %s: disponível %s %s, solicitado %s"
				.formatted(produto.getNome(), saldoAtual.stripTrailingZeros().toPlainString(),
						produto.getUnidade(), quantidade.stripTrailingZeros().toPlainString()));
		}
		produto.atualizarSaldo(novoSaldo);

		Instant agora = Instant.now();
		Movimentacao mov = new Movimentacao();
		mov.setProduto(produto);
		mov.setTipo(tipo);
		mov.setQuantidade(quantidade);
		mov.setSaldoApos(novoSaldo);
		mov.setMotivo(motivo);
		mov.setResponsavel(responsavel);
		mov.setIdCliente(idCliente);
		// Horário do dispositivo é aceito para lançamentos offline, mas nunca no futuro.
		mov.setOcorridoEm(ocorridoEm == null || ocorridoEm.isAfter(agora) ? agora : ocorridoEm);
		mov.setRegistradoEm(agora);
		return movimentacoes.save(mov);
	}

	@Transactional(readOnly = true)
	public List<Movimentacao> listar(Long produtoId, int limite) {
		return movimentacoes.listar(produtoId, PageRequest.of(0, Math.clamp(limite, 1, 500)));
	}

	@Transactional(readOnly = true)
	public List<Produto> abaixoDoMinimo() {
		return produtos.findAbaixoDoMinimo();
	}
}
