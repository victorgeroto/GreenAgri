import L from 'leaflet'
import { Check, PenLine, Undo2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, LayersControl, LayerGroup, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { centroDaFazenda, useFazenda } from '@/fazenda/FazendaContext'
import { fmtNumero, fmtRelativo, STATUS_COLHEITA } from '@/lib/format'
import { areaHa, paraLatLngs, type LatLng } from '@/lib/geo'
import type { Colheita, Dispositivo, Leitura, Talhao } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { COR_SEM_LAVOURA, COR_STATUS } from './cores'


interface Props {
  talhoes: Talhao[]
  /** Colheita exibida em cada talhão (id do talhão → colheita), conforme o filtro de safra. */
  porTalhao: Map<number, Colheita>
  dispositivos: Dispositivo[]
  selecionado?: number
  onSelecionar: (t: Talhao) => void
  onDesenhoConcluido: (pontos: LatLng[]) => void
}

function AjustarVisao({ talhoes }: { talhoes: Talhao[] }) {
  const map = useMap()
  const ajustado = useRef(false)
  useEffect(() => {
    const pontos = talhoes.flatMap((t) => (t.geometria ? paraLatLngs(t.geometria) : []))
    if (ajustado.current || pontos.length === 0) return
    map.fitBounds(L.latLngBounds(pontos), { padding: [24, 24] })
    ajustado.current = true
  }, [talhoes, map])
  return null
}

function CapturaCliques({ ativo, onPonto }: { ativo: boolean; onPonto: (p: LatLng) => void }) {
  const map = useMapEvents({ click: (e) => ativo && onPonto([e.latlng.lat, e.latlng.lng]) })
  useEffect(() => {
    map.getContainer().style.cursor = ativo ? 'crosshair' : ''
  }, [ativo, map])
  return null
}

const iconeMaquina = (rotulo: string, operando: boolean) =>
  L.divIcon({
    className: '',
    html: `<div class="marcador-maquina ${operando ? 'operando' : ''}">${rotulo}</div>`,
    iconSize: [64, 24],
    iconAnchor: [32, 12],
  })

/** Máquina com o trajeto das últimas 3 h; trechos em operação ficam destacados. */
function Maquina({ d }: { d: Dispositivo }) {
  const { data: leituras = [] } = useDados<Leitura[]>(`/iot/dispositivos/${d.id}/leituras?horas=3`, { refetchInterval: 15_000 })
  const trajeto = leituras.filter((l) => l.latitude != null && l.longitude != null)
  const ultima = d.ultimaLeitura
  if (d.latitude == null || d.longitude == null) return null
  const trabalhando = trajeto.filter((l) => l.operando).map((l) => [l.latitude!, l.longitude!] as LatLng)
  return (
    <>
      <Polyline positions={trajeto.map((l) => [l.latitude!, l.longitude!] as LatLng)} pathOptions={{ color: '#44403c', weight: 2, opacity: 0.6, dashArray: '4 4' }} />
      {trabalhando.length > 1 && <Polyline positions={trabalhando} pathOptions={{ color: '#44403c', weight: 4, opacity: 0.85 }} />}
      <Marker position={[d.latitude, d.longitude]} icon={iconeMaquina(d.veiculoIdentificacao ?? d.codigo, !!ultima?.operando)}>
        <Popup>
          <p className="font-semibold">{d.nome}</p>
          <p className="text-xs text-stone-600">
            {ultima?.operando ? 'Operando' : 'Deslocamento / parada'} · {fmtNumero(ultima?.velocidade ?? 0)} km/h
          </p>
          <p className="text-xs text-stone-500">Atualizado {fmtRelativo(d.ultimoContato)}</p>
          <Link to={`/campo/${d.id}`} className="text-xs font-medium text-brand-700">Ver telemetria</Link>
        </Popup>
      </Marker>
    </>
  )
}

export function MapaFazenda({ talhoes, porTalhao, dispositivos, selecionado, onSelecionar, onDesenhoConcluido }: Props) {
  const [desenho, setDesenho] = useState<LatLng[] | null>(null)
  const { centro, zoom } = centroDaFazenda(useFazenda().atual)
  const [legendaAberta] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const desenhados = useMemo(() => talhoes.filter((t) => t.geometria), [talhoes])
  const sensores = dispositivos.filter((d) => d.tipo !== 'RASTREADOR_MAQUINA' && d.latitude != null && d.longitude != null)
  const maquinas = dispositivos.filter((d) => d.tipo === 'RASTREADOR_MAQUINA')

  return (
    <div className="relative isolate h-[62vh] min-h-[420px] overflow-hidden rounded-lg border border-stone-200 lg:h-[calc(100vh-15rem)]">
      <MapContainer center={centro} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Mapa (OpenStreetMap)">
            <TileLayer
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite (Esri)">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Imagens &copy; Esri, Maxar, Earthstar Geographics"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Sensores de campo">
            <LayerGroup>
              {sensores.map((d) => (
                <CircleMarker
                  key={d.id}
                  center={[d.latitude!, d.longitude!]}
                  radius={6}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: d.online ? '#0f172a' : '#a8a29e', fillOpacity: 1 }}
                >
                  <Popup>
                    <p className="font-semibold">{d.nome}</p>
                    <p className="text-xs text-stone-600">{d.online ? 'Online' : 'Offline'} · {fmtRelativo(d.ultimoContato)}</p>
                    <Link to={`/campo/${d.id}`} className="text-xs font-medium text-brand-700">Ver leituras</Link>
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Máquinas (rastreador)">
            <LayerGroup>
              {maquinas.map((d) => (
                <Maquina key={d.id} d={d} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        {desenhados.map((t) => {
          const c = porTalhao.get(t.id)
          const cor = c ? COR_STATUS[c.status] : COR_SEM_LAVOURA
          const ativo = t.id === selecionado
          return (
            <Polygon
              key={`${t.id}-${c?.id ?? 'vazio'}-${c?.status}-${ativo}`}
              positions={paraLatLngs(t.geometria!)}
              pathOptions={{
                color: ativo ? '#0c0a09' : cor,
                weight: ativo ? 4 : 2,
                fillColor: cor,
                fillOpacity: c && c.status !== 'PLANEJADA' ? 0.4 : 0.12,
                dashArray: !c || c.status === 'PLANEJADA' ? '6 5' : undefined,
              }}
              eventHandlers={{ click: () => !desenho && onSelecionar(t) }}
            >
              <Tooltip permanent interactive direction="center" className="rotulo-talhao">
                <strong>{t.codigo}</strong> {c ? `· ${c.cultura}` : ''}
                <br />
                <span>{c ? `${STATUS_COLHEITA[c.status]}${c.statusPendente ? ' (na fila)' : ''}` : 'Sem lavoura'}</span>
              </Tooltip>
            </Polygon>
          )
        })}

        {desenho && desenho.length > 0 && (
          <>
            <Polygon positions={desenho} pathOptions={{ color: '#0c0a09', weight: 2, dashArray: '4 4', fillOpacity: 0.15 }} />
            {desenho.map((p, i) => (
              <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#0c0a09', fillOpacity: 1 }} />
            ))}
          </>
        )}

        <AjustarVisao talhoes={desenhados} />
        <CapturaCliques ativo={!!desenho} onPonto={(p) => setDesenho((d) => [...(d ?? []), p])} />
      </MapContainer>

      {/* Barra de desenho */}
      <div className="absolute left-14 top-3 z-[1000] flex flex-wrap gap-2">
        {desenho ? (
          <div className="flex items-center gap-1 rounded-md bg-white p-1 shadow-md">
            <span className="px-2 text-xs text-stone-600">
              {desenho.length < 3 ? 'Toque nos vértices do talhão' : `${desenho.length} pontos · ${fmtNumero(Math.round(areaHa(desenho) * 10) / 10)} ha`}
            </span>
            <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setDesenho((d) => d!.slice(0, -1))} disabled={desenho.length === 0} aria-label="Desfazer ponto" />
            <Button size="sm" variant="ghost" icon={X} onClick={() => setDesenho(null)} aria-label="Cancelar desenho" />
            <Button
              size="sm"
              icon={Check}
              disabled={desenho.length < 3}
              onClick={() => {
                onDesenhoConcluido(desenho)
                setDesenho(null)
              }}
            >
              Concluir
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" icon={PenLine} onClick={() => setDesenho([])} className="shadow-md">
            Desenhar talhão
          </Button>
        )}
      </div>

      {/* Legenda: recolhida no celular para não cobrir o mapa */}
      <details open={legendaAberta} className="absolute bottom-6 left-3 z-[1000] rounded-md bg-white/95 p-2.5 text-xs shadow-md">
        <summary className="cursor-pointer select-none font-medium text-stone-700">Status da lavoura</summary>
        <ul className="mt-1 space-y-1">
          {(Object.keys(COR_STATUS) as (keyof typeof COR_STATUS)[]).map((s) => (
            <li key={s} className="flex items-center gap-2 text-stone-700">
              <span
                className="h-3 w-4 rounded-sm border-2"
                style={{ borderColor: COR_STATUS[s], background: s === 'PLANEJADA' ? 'transparent' : `${COR_STATUS[s]}66`, borderStyle: s === 'PLANEJADA' ? 'dashed' : 'solid' }}
                aria-hidden
              />
              {STATUS_COLHEITA[s]}
            </li>
          ))}
          <li className="flex items-center gap-2 text-stone-700">
            <span className="h-3 w-4 rounded-sm border-2 border-dashed" style={{ borderColor: COR_SEM_LAVOURA }} aria-hidden />
            Sem lavoura
          </li>
        </ul>
      </details>
    </div>
  )
}
