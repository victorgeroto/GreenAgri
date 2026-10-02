package com.greenagri.talhao;

import java.util.ArrayList;
import java.util.List;

import com.greenagri.shared.RegraNegocioException;

/**
 * Polígono GeoJSON ({@code {"type":"Polygon","coordinates":[[[lon,lat],...]]}}).
 * Só o anel externo é considerado; os cálculos usam uma projeção local
 * equiretangular, com erro desprezível na escala de um talhão (poucos km).
 */
public record Poligono(String type, List<List<List<Double>>> coordinates) {

	private static final double RAIO_TERRA_M = 6_371_008.8;
	private static final int MAX_VERTICES = 500;

	public record Ponto(double lat, double lon) {
	}

	/** Valida e devolve o anel externo fechado (primeiro ponto = último). */
	public List<Ponto> anel() {
		if (!"Polygon".equals(type) || coordinates == null || coordinates.isEmpty()) {
			throw new RegraNegocioException("A geometria deve ser um GeoJSON do tipo Polygon");
		}
		List<Ponto> pontos = new ArrayList<>();
		for (List<Double> c : coordinates.getFirst()) {
			if (c == null || c.size() < 2 || c.get(0) == null || c.get(1) == null) {
				throw new RegraNegocioException("Coordenada inválida no polígono");
			}
			double lon = c.get(0);
			double lat = c.get(1);
			if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
				throw new RegraNegocioException("Coordenada fora do intervalo: [" + lon + ", " + lat + "]");
			}
			pontos.add(new Ponto(lat, lon));
		}
		if (!pontos.isEmpty() && !pontos.getFirst().equals(pontos.getLast())) {
			pontos.add(pontos.getFirst());
		}
		if (pontos.size() < 4) {
			throw new RegraNegocioException("O talhão precisa de pelo menos 3 vértices");
		}
		if (pontos.size() > MAX_VERTICES) {
			throw new RegraNegocioException("O polígono tem vértices demais (máximo " + MAX_VERTICES + ")");
		}
		return pontos;
	}

	public double areaHectares() {
		List<Ponto> p = anel();
		double lat0 = Math.toRadians(p.getFirst().lat());
		double soma = 0;
		for (int i = 0; i < p.size() - 1; i++) {
			soma += x(p.get(i), lat0) * y(p.get(i + 1)) - x(p.get(i + 1), lat0) * y(p.get(i));
		}
		return Math.abs(soma) / 2 / 10_000;
	}

	/** Centróide da área (usado para posicionar rótulos e centralizar o mapa). */
	public Ponto centroide() {
		List<Ponto> p = anel();
		double a = 0;
		double cx = 0;
		double cy = 0;
		for (int i = 0; i < p.size() - 1; i++) {
			double cruz = p.get(i).lon() * p.get(i + 1).lat() - p.get(i + 1).lon() * p.get(i).lat();
			a += cruz;
			cx += (p.get(i).lon() + p.get(i + 1).lon()) * cruz;
			cy += (p.get(i).lat() + p.get(i + 1).lat()) * cruz;
		}
		if (Math.abs(a) < 1e-15) {
			return p.getFirst();
		}
		return new Ponto(cy / (3 * a), cx / (3 * a));
	}

	/** Ray casting: o ponto está dentro do anel externo? */
	public boolean contem(double lat, double lon) {
		List<Ponto> p = anel();
		boolean dentro = false;
		for (int i = 0, j = p.size() - 2; i < p.size() - 1; j = i++) {
			Ponto a = p.get(i);
			Ponto b = p.get(j);
			boolean cruza = (a.lat() > lat) != (b.lat() > lat)
					&& lon < (b.lon() - a.lon()) * (lat - a.lat()) / (b.lat() - a.lat()) + a.lon();
			if (cruza) {
				dentro = !dentro;
			}
		}
		return dentro;
	}

	private static double x(Ponto p, double lat0) {
		return Math.toRadians(p.lon()) * Math.cos(lat0) * RAIO_TERRA_M;
	}

	private static double y(Ponto p) {
		return Math.toRadians(p.lat()) * RAIO_TERRA_M;
	}
}
