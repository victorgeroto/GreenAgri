package com.greenagri.produto;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.estoque.EstoqueService;
import com.greenagri.estoque.TipoMovimentacao;
import com.greenagri.produto.ProdutoDtos.ProdutoRequest;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProdutoService {

	private final ProdutoRepository produtos;
	private final EstoqueService estoqueService;

	@Transactional(readOnly = true)
	public List<Produto> buscar(String termo, Categoria categoria) {
		String filtro = termo == null || termo.isBlank() ? null : "%" + termo.trim().toLowerCase() + "%";
		return produtos.buscar(filtro, categoria);
	}

	@Transactional(readOnly = true)
	public Produto obter(Long id) {
		return produtos.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Produto", id));
	}

	@Transactional
	public Produto criar(ProdutoRequest req, String responsavel) {
		if (produtos.existsBySkuIgnoreCase(req.sku())) {
			throw new RegraNegocioException("Já existe um produto com o SKU " + req.sku());
		}
		Produto produto = new Produto();
		aplicar(produto, req);
		produtos.save(produto);
		if (req.quantidadeInicial() != null && req.quantidadeInicial().compareTo(BigDecimal.ZERO) > 0) {
			estoqueService.registrar(produto.getId(), TipoMovimentacao.ENTRADA, req.quantidadeInicial(),
					"Saldo inicial", responsavel, null, null);
		}
		return produto;
	}

	@Transactional
	public Produto atualizar(Long id, ProdutoRequest req) {
		Produto produto = obter(id);
		if (produtos.existsBySkuIgnoreCaseAndIdNot(req.sku(), id)) {
			throw new RegraNegocioException("Já existe um produto com o SKU " + req.sku());
		}
		if (req.unidade() != produto.getUnidade() && produto.getQuantidadeAtual().signum() != 0) {
			throw new RegraNegocioException("Não é possível trocar a unidade de um produto com saldo em estoque");
		}
		aplicar(produto, req);
		return produto;
	}

	@Transactional
	public void excluir(Long id) {
		produtos.delete(obter(id));
	}

	private static void aplicar(Produto p, ProdutoRequest req) {
		p.setSku(req.sku().trim().toUpperCase());
		p.setNome(req.nome().trim());
		p.setCategoria(req.categoria());
		p.setUnidade(req.unidade());
		p.setEstoqueMinimo(req.estoqueMinimo());
		p.setLocalizacao(req.localizacao());
		p.setDescricao(req.descricao());
		p.setImagem(req.imagem() == null || req.imagem().isBlank() ? null : req.imagem());
	}
}
