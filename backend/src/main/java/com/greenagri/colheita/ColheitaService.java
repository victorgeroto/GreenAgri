package com.greenagri.colheita;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.colheita.ColheitaDtos.ColheitaRequest;
import com.greenagri.colheita.ColheitaDtos.ConclusaoRequest;
import com.greenagri.estoque.EstoqueService;
import com.greenagri.estoque.TipoMovimentacao;
import com.greenagri.produto.Produto;
import com.greenagri.produto.ProdutoRepository;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ColheitaService {

	private final ColheitaRepository colheitas;
	private final ProdutoRepository produtos;
	private final EstoqueService estoqueService;

	@Transactional(readOnly = true)
	public List<Colheita> listar() {
		return colheitas.findAllByOrderByPrevisaoColheitaAsc();
	}

	@Transactional(readOnly = true)
	public Colheita obter(Long id) {
		return colheitas.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Colheita", id));
	}

	@Transactional
	public Colheita criar(ColheitaRequest req) {
		Colheita colheita = new Colheita();
		aplicar(colheita, req);
		return colheitas.save(colheita);
	}

	@Transactional
	public Colheita atualizar(Long id, ColheitaRequest req) {
		Colheita colheita = obter(id);
		if (colheita.getStatus() == StatusColheita.CONCLUIDA) {
			throw new RegraNegocioException("Colheitas concluídas não podem ser alteradas");
		}
		aplicar(colheita, req);
		return colheita;
	}

	/**
	 * Fecha a colheita e lança a produção como ENTRADA no produto vinculado,
	 * convertendo de kg para a unidade do produto.
	 */
	@Transactional
	public Colheita concluir(Long id, ConclusaoRequest req, String responsavel) {
		Colheita colheita = obter(id);
		if (colheita.getStatus() == StatusColheita.CONCLUIDA) {
			throw new RegraNegocioException("Esta colheita já foi concluída");
		}
		colheita.setDataColheita(req.dataColheita());
		colheita.setProducaoRealKg(req.producaoRealKg());
		colheita.setStatus(StatusColheita.CONCLUIDA);

		Produto produto = colheita.getProduto();
		if (produto != null) {
			BigDecimal quantidade = converterDeKg(req.producaoRealKg(), produto);
			estoqueService.registrar(produto.getId(), TipoMovimentacao.ENTRADA, quantidade,
					"Colheita " + colheita.getCultura() + " - talhão " + colheita.getTalhao(), responsavel, null,
					null);
		}
		return colheita;
	}

	@Transactional
	public void excluir(Long id) {
		colheitas.delete(obter(id));
	}

	static BigDecimal converterDeKg(BigDecimal kg, Produto produto) {
		BigDecimal fator = produto.getUnidade().kgPorUnidade()
			.orElseThrow(() -> new RegraNegocioException("O produto " + produto.getNome() + " usa a unidade "
					+ produto.getUnidade() + ", incompatível com produção em kg"));
		return kg.divide(fator, 2, RoundingMode.HALF_UP);
	}

	private void aplicar(Colheita c, ColheitaRequest req) {
		c.setTalhao(req.talhao().trim());
		c.setCultura(req.cultura().trim());
		c.setAreaHa(req.areaHa());
		c.setDataPlantio(req.dataPlantio());
		c.setPrevisaoColheita(req.previsaoColheita());
		c.setProducaoEstimadaKg(req.producaoEstimadaKg());
		c.setObservacoes(req.observacoes());
		if (req.status() != null && req.status() != StatusColheita.CONCLUIDA) {
			c.setStatus(req.status());
		}
		c.setProduto(req.produtoId() == null ? null
				: produtos.findById(req.produtoId())
					.orElseThrow(() -> new RecursoNaoEncontradoException("Produto", req.produtoId())));
	}
}
