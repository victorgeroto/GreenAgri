import { describe, expect, it } from 'vitest'
import { safraDe } from './format'
import { areaHa, paraGeoJSON, paraLatLngs, type LatLng } from './geo'

const LAT = -24.95
const LON = -53.45
const DLAT = 1 / 110.574
const DLON = 1 / (111.32 * Math.cos((LAT * Math.PI) / 180))
const quadrado: LatLng[] = [
  [LAT, LON],
  [LAT, LON + DLON],
  [LAT + DLAT, LON + DLON],
  [LAT + DLAT, LON],
]

describe('geo', () => {
  it('calcula ~100 ha para um quadrado de 1 km', () => {
    expect(areaHa(quadrado)).toBeCloseTo(100, 0)
  })

  it('converte para GeoJSON fechado e volta', () => {
    const geo = paraGeoJSON(quadrado)
    expect(geo.coordinates[0]).toHaveLength(5)
    expect(geo.coordinates[0][0]).toEqual([LON, LAT])
    expect(paraLatLngs(geo).slice(0, 4)).toEqual(quadrado)
  })
})

describe('safraDe', () => {
  it('segue o ano-safra de julho a junho', () => {
    expect(safraDe('2025-09-15')).toBe('2025/26')
    expect(safraDe('2026-02-10')).toBe('2025/26')
    expect(safraDe('2026-07-01')).toBe('2026/27')
  })
})
