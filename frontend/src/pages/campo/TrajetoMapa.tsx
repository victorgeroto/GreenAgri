import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { fmtDataHora } from '@/lib/format'
import { paraLatLngs, type LatLng } from '@/lib/geo'
import type { Leitura, Talhao } from '@/lib/types'
import { centroDaFazenda, useFazenda } from '@/fazenda/FazendaContext'

/** Enquadra o trajeto quando os primeiros pontos chegam; depois deixa o usuário navegar. */
function Enquadrar({ pontos }: { pontos: LatLng[] }) {
  const map = useMap()
  const feito = useRef(false)
  useEffect(() => {
    if (feito.current || pontos.length === 0) return
    if (pontos.length > 1) map.fitBounds(L.latLngBounds(pontos), { padding: [30, 30], maxZoom: 17 })
    else map.setView(pontos[0], 16)
    feito.current = true
  }, [pontos, map])
  return null
}

/** Trajeto da máquina sobre os talhões; trechos com o implemento operando ficam em linha cheia. */
export function TrajetoMapa({ leituras, talhoes }: { leituras: Leitura[]; talhoes: Talhao[] }) {
  const sede = centroDaFazenda(useFazenda().atual).centro
  const pontos = leituras.filter((l) => l.latitude != null && l.longitude != null)
  const trajeto = pontos.map((l) => [l.latitude!, l.longitude!] as LatLng)
  const operando = pontos.filter((l) => l.operando).map((l) => [l.latitude!, l.longitude!] as LatLng)
  const ultima = pontos.at(-1)

  return (
    <figure className="relative isolate h-80 overflow-hidden rounded-lg border border-stone-200 lg:col-span-2" aria-label="Trajeto da máquina no mapa">
      <MapContainer center={trajeto[0] ?? sede} zoom={15} className="h-full w-full">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
        {talhoes.filter((t) => t.geometria).map((t) => (
          <Polygon key={t.id} positions={paraLatLngs(t.geometria!)} pathOptions={{ color: '#78716c', weight: 1, fillOpacity: 0.05 }}>
            <Tooltip direction="center" className="rotulo-talhao">{t.codigo}</Tooltip>
          </Polygon>
        ))}
        <Polyline positions={trajeto} pathOptions={{ color: '#44403c', weight: 2, dashArray: '4 4' }} />
        {operando.length > 1 && <Polyline positions={operando} pathOptions={{ color: '#eb6834', weight: 4 }} />}
        {ultima && (
          <CircleMarker center={[ultima.latitude!, ultima.longitude!]} radius={7} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0c0a09', fillOpacity: 1 }}>
            <Tooltip>Última posição · {fmtDataHora(ultima.medidoEm)}</Tooltip>
          </CircleMarker>
        )}
        <Enquadrar pontos={trajeto} />
      </MapContainer>
      <figcaption className="absolute bottom-3 left-3 z-[1000] flex gap-3 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs text-stone-700 shadow">
        <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[#eb6834]" aria-hidden /> Operando</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-stone-700" aria-hidden /> Deslocamento</span>
      </figcaption>
    </figure>
  )
}
