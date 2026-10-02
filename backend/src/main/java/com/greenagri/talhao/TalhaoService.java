package com.greenagri.talhao;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenagri.shared.RecursoNaoEncontradoException;
import com.greenagri.shared.RegraNegocioException;
import com.greenagri.talhao.TalhaoDtos.TalhaoRequest;
import com.greenagri.talhao.TalhaoDtos.TalhaoResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TalhaoService {

	private final TalhaoRepository talhoes;
	private final ObjectMapper mapper;

	@Transactional(readOnly = true)
	public List<TalhaoResponse> listar() {
		return talhoes.findAllByOrderByCodigoAsc().stream().map(this::paraResponse).toList();
	}

	@Transactional(readOnly = true)
	public Talhao obter(Long id) {
		return talhoes.findById(id).orElseThrow(() -> new RecursoNaoEncontradoException("Talhão", id));
	}

	@Transactional
	public Talhao criar(TalhaoRequest req) {
		if (talhoes.existsByCodigoIgnoreCase(req.codigo())) {
			throw new RegraNegocioException("Já existe o talhão " + req.codigo());
		}
		Talhao t = new Talhao();
		aplicar(t, req);
		return talhoes.save(t);
	}

	@Transactional
	public Talhao atualizar(Long id, TalhaoRequest req) {
		Talhao t = obter(id);
		if (talhoes.existsByCodigoIgnoreCaseAndIdNot(req.codigo(), id)) {
			throw new RegraNegocioException("Já existe o talhão " + req.codigo());
		}
		aplicar(t, req);
		return t;
	}

	@Transactional
	public void excluir(Long id) {
		talhoes.delete(obter(id));
	}

	/** Talhão com o polígono já interpretado, para testar vários pontos sem reler o JSON. */
	public record TalhaoGeo(Talhao talhao, Poligono poligono) {

		public boolean contem(double lat, double lon) {
			return poligono.contem(lat, lon);
		}
	}

	/** Talhões desenhados no mapa (base do geofence das máquinas). */
	@Transactional(readOnly = true)
	public List<TalhaoGeo> desenhados() {
		return talhoes.findByGeometriaIsNotNull().stream()
			.map(t -> new TalhaoGeo(t, poligono(t).orElseThrow()))
			.toList();
	}

	public TalhaoResponse paraResponse(Talhao t) {
		return new TalhaoResponse(t.getId(), t.getCodigo(), t.getNome(), poligono(t).orElse(null), t.getAreaHa(),
				t.getLatitude(), t.getLongitude());
	}

	private void aplicar(Talhao t, TalhaoRequest req) {
		t.setCodigo(req.codigo().trim().toUpperCase());
		t.setNome(req.nome().trim());
		Poligono geo = req.geometria();
		if (geo == null) {
			t.setGeometria(null);
			t.setAreaHa(null);
			t.setLatitude(null);
			t.setLongitude(null);
			return;
		}
		geo.anel(); // valida antes de gravar
		Poligono.Ponto centro = geo.centroide();
		t.setGeometria(escrever(geo));
		t.setAreaHa(BigDecimal.valueOf(geo.areaHectares()).setScale(2, RoundingMode.HALF_UP));
		t.setLatitude(centro.lat());
		t.setLongitude(centro.lon());
	}

	private Optional<Poligono> poligono(Talhao t) {
		if (t.getGeometria() == null) {
			return Optional.empty();
		}
		try {
			return Optional.of(mapper.readValue(t.getGeometria(), Poligono.class));
		}
		catch (JsonProcessingException e) {
			throw new IllegalStateException("Geometria corrompida no talhão " + t.getCodigo(), e);
		}
	}

	private String escrever(Poligono p) {
		try {
			return mapper.writeValueAsString(p);
		}
		catch (JsonProcessingException e) {
			throw new IllegalStateException(e);
		}
	}
}
