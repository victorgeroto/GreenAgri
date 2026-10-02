package com.greenagri.iot;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

import com.greenagri.iot.IotDtos.LeituraResponse;
import com.greenagri.iot.IotDtos.ReconciliacaoSilo;
import com.greenagri.produto.Produto;
import com.greenagri.produto.Unidade;

class ReconciliacaoSiloTest {

	@Test
	void comparaNivelMedidoComSaldoRegistradoEmKg() {
		// 2.000 sacas = 120.000 kg registrados; sensor mede 50% de 200.000 kg = 100.000 kg
		ReconciliacaoSilo r = IotService.reconciliar(silo(2000, 200000), nivel(50.0));

		assertThat(r.registradoKg()).isEqualByComparingTo("120000");
		assertThat(r.medidoKg()).isEqualByComparingTo("100000");
		assertThat(r.divergenciaPercentual()).isEqualByComparingTo("-16.7");
		assertThat(r.divergente()).isTrue();
	}

	@Test
	void pequenaDiferencaNaoEhDivergencia() {
		ReconciliacaoSilo r = IotService.reconciliar(silo(2000, 200000), nivel(61.0));
		assertThat(r.divergente()).isFalse();
	}

	@Test
	void ignoraDispositivosQueNaoSaoSilo() {
		Dispositivo d = silo(2000, 200000);
		d.setTipo(TipoDispositivo.SENSOR_SOLO);
		assertThat(IotService.reconciliar(d, nivel(50.0))).isNull();
	}

	private static Dispositivo silo(int sacas, int capacidadeKg) {
		Produto p = new Produto();
		p.setNome("Milho");
		p.setUnidade(Unidade.SACA);
		p.atualizarSaldo(BigDecimal.valueOf(sacas));
		Dispositivo d = new Dispositivo();
		d.setTipo(TipoDispositivo.SENSOR_SILO);
		d.setProduto(p);
		d.setCapacidadeKg(BigDecimal.valueOf(capacidadeKg));
		return d;
	}

	private static LeituraResponse nivel(double percentual) {
		return new LeituraResponse(null, 24.0, null, null, percentual, 100.0, -70, null, null, null, null);
	}
}
