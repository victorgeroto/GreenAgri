package com.greenagri.dashboard;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.greenagri.colheita.ColheitaDtos.ColheitaResponse;
import com.greenagri.colheita.ColheitaRepository;
import com.greenagri.colheita.StatusColheita;
import com.greenagri.estoque.EstoqueDtos.MovimentacaoResponse;
import com.greenagri.estoque.MovimentacaoRepository;
import com.greenagri.frota.StatusVeiculo;
import com.greenagri.frota.VeiculoRepository;
import com.greenagri.iot.AlertaRepository;
import com.greenagri.iot.IotDtos.DispositivoResponse;
import com.greenagri.iot.IotService;
import com.greenagri.produto.ProdutoDtos.ProdutoResponse;
import com.greenagri.produto.ProdutoRepository;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
public class DashboardController {

	private final ProdutoRepository produtos;
	private final MovimentacaoRepository movimentacoes;
	private final ColheitaRepository colheitas;
	private final VeiculoRepository veiculos;
	private final AlertaRepository alertas;
	private final IotService iotService;

	public record Resumo(
			long produtos, List<ProdutoResponse> estoqueBaixo, long movimentacoes30d,
			List<MovimentacaoResponse> ultimasMovimentacoes, long colheitasAbertas,
			List<ColheitaResponse> proximasColheitas, long veiculosEmManutencao, long manutencoesPendentes,
			long dispositivosOnline, long dispositivos, long alertasIotAbertos, List<DispositivoResponse> silos) {
	}

	@GetMapping
	@Transactional(readOnly = true)
	@Operation(summary = "Indicadores consolidados da fazenda")
	public Resumo resumo() {
		List<DispositivoResponse> disp = iotService.listarDispositivos();
		return new Resumo(
				produtos.count(),
				produtos.findAbaixoDoMinimo().stream().map(ProdutoResponse::de).toList(),
				movimentacoes.countByOcorridoEmAfter(Instant.now().minus(Duration.ofDays(30))),
				movimentacoes.listar(null, PageRequest.of(0, 5)).stream().map(MovimentacaoResponse::de).toList(),
				colheitas.countByStatusNot(StatusColheita.CONCLUIDA),
				colheitas.findAllByOrderByPrevisaoColheitaAsc().stream()
					.filter(c -> c.getStatus() != StatusColheita.CONCLUIDA)
					.limit(3)
					.map(ColheitaResponse::de)
					.toList(),
				veiculos.countByStatus(StatusVeiculo.MANUTENCAO),
				veiculos.countByProximaManutencaoLessThanEqualAndStatusNot(LocalDate.now().plusDays(7),
						StatusVeiculo.INATIVO),
				disp.stream().filter(DispositivoResponse::online).count(),
				disp.size(),
				alertas.countByReconhecidoFalse(),
				disp.stream().filter(d -> d.silo() != null).toList());
	}
}
