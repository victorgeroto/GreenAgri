package com.greenagri.iot;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.greenagri.colheita.ColheitaService;
import com.greenagri.frota.StatusVeiculo;
import com.greenagri.frota.TipoVeiculo;
import com.greenagri.frota.Veiculo;
import com.greenagri.talhao.TalhaoService;
import com.greenagri.talhao.TalhaoService.TalhaoGeo;

import lombok.RequiredArgsConstructor;

/**
 * Cruza a posição das máquinas com os polígonos dos talhões.
 * Colheitadeira operando (plataforma ligada) dentro de um talhão com lavoura
 * em desenvolvimento = colheita iniciada, registrada com o horário e o ponto
 * da primeira leitura — inclusive se o lote chegou atrasado (store-and-forward).
 */
@Service
@RequiredArgsConstructor
public class GeofenceService {

	private final TalhaoService talhoes;
	private final ColheitaService colheitas;

	/** @param leituras leituras novas do lote, em ordem cronológica */
	@Transactional
	public int processar(Dispositivo dispositivo, List<Leitura> leituras) {
		Veiculo veiculo = dispositivo.getVeiculo();
		if (dispositivo.getTipo() != TipoDispositivo.RASTREADOR_MAQUINA || veiculo == null) {
			return 0;
		}
		List<TalhaoGeo> mapa = null;
		Set<Long> talhoesVistos = new HashSet<>();
		int mudancas = 0;
		for (Leitura l : leituras) {
			if (l.getLatitude() == null || l.getLongitude() == null || !Boolean.TRUE.equals(l.getOperando())) {
				continue;
			}
			if (veiculo.getStatus() == StatusVeiculo.DISPONIVEL) {
				veiculo.setStatus(StatusVeiculo.EM_OPERACAO);
			}
			if (veiculo.getTipo() != TipoVeiculo.COLHEITADEIRA) {
				continue;
			}
			if (mapa == null) {
				mapa = talhoes.desenhados();
			}
			for (TalhaoGeo t : mapa) {
				if (t.contem(l.getLatitude(), l.getLongitude()) && talhoesVistos.add(t.talhao().getId())) {
					String maquina = veiculo.getIdentificacao() + " (" + veiculo.getModelo() + ")";
					if (colheitas.iniciarPorMaquina(t.talhao(), maquina, l.getLatitude(), l.getLongitude(),
							l.getMedidoEm()).isPresent()) {
						mudancas++;
					}
				}
			}
		}
		return mudancas;
	}
}
