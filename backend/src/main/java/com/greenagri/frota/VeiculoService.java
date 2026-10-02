package com.greenagri.frota;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.frota.VeiculoDtos.VeiculoRequest;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VeiculoService {

	private final VeiculoRepository veiculos;

	@Transactional(readOnly = true)
	public List<Veiculo> listar() {
		return veiculos.findAllByOrderByIdentificacaoAsc();
	}

	@Transactional(readOnly = true)
	public Veiculo obter(Long id) {
		return veiculos.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Veículo", id));
	}

	@Transactional
	public Veiculo criar(VeiculoRequest req) {
		if (veiculos.existsByIdentificacaoIgnoreCase(req.identificacao())) {
			throw new RegraNegocioException("Já existe um veículo com a identificação " + req.identificacao());
		}
		Veiculo veiculo = new Veiculo();
		aplicar(veiculo, req);
		return veiculos.save(veiculo);
	}

	@Transactional
	public Veiculo atualizar(Long id, VeiculoRequest req) {
		Veiculo veiculo = obter(id);
		if (veiculos.existsByIdentificacaoIgnoreCaseAndIdNot(req.identificacao(), id)) {
			throw new RegraNegocioException("Já existe um veículo com a identificação " + req.identificacao());
		}
		if (req.horimetro().compareTo(veiculo.getHorimetro()) < 0) {
			throw new RegraNegocioException("O horímetro não pode ser menor que o valor atual");
		}
		aplicar(veiculo, req);
		return veiculo;
	}

	@Transactional
	public void excluir(Long id) {
		veiculos.delete(obter(id));
	}

	private static void aplicar(Veiculo v, VeiculoRequest req) {
		v.setIdentificacao(req.identificacao().trim().toUpperCase());
		v.setModelo(req.modelo().trim());
		v.setTipo(req.tipo());
		v.setAno(req.ano());
		v.setHorimetro(req.horimetro());
		v.setStatus(req.status());
		v.setProximaManutencao(req.proximaManutencao());
		v.setObservacoes(req.observacoes());
	}
}
