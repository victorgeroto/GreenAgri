import type { Poligono } from './types'

/** Ponto no formato do Leaflet: [latitude, longitude]. */
export type LatLng = [number, number]

const RAIO_TERRA_M = 6_371_008.8
const rad = (g: number) => (g * Math.PI) / 180

/** Área em hectares (projeção local equiretangular — mesma conta do backend). */
export function areaHa(pontos: LatLng[]): number {
  if (pontos.length < 3) return 0
  const lat0 = rad(pontos[0][0])
  const x = ([, lon]: LatLng) => rad(lon) * Math.cos(lat0) * RAIO_TERRA_M
  const y = ([lat]: LatLng) => rad(lat) * RAIO_TERRA_M
  let soma = 0
  for (let i = 0; i < pontos.length; i++) {
    const a = pontos[i]
    const b = pontos[(i + 1) % pontos.length]
    soma += x(a) * y(b) - x(b) * y(a)
  }
  return Math.abs(soma) / 2 / 10_000
}

/** Converte vértices desenhados no mapa em GeoJSON ([lon, lat], anel fechado). */
export function paraGeoJSON(pontos: LatLng[]): Poligono {
  const anel = pontos.map(([lat, lon]) => [lon, lat] as [number, number])
  anel.push(anel[0])
  return { type: 'Polygon', coordinates: [anel] }
}

export function paraLatLngs(p: Poligono): LatLng[] {
  return p.coordinates[0].map(([lon, lat]) => [lat, lon])
}
