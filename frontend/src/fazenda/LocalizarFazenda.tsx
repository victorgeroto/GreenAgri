import L from 'leaflet'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Button, Input } from '@/components/ui'

export interface Posicao {
  latitude: number
  longitude: number
}

interface Resultado {
  display_name: string
  lat: string
  lon: string
}

const marcador = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#235737;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

function Centralizar({ pos }: { pos?: Posicao }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.setView([pos.latitude, pos.longitude], Math.max(map.getZoom(), 14))
  }, [pos, map])
  return null
}

function CliqueNoMapa({ onEscolher }: { onEscolher: (p: Posicao) => void }) {
  useMapEvents({ click: (e) => onEscolher({ latitude: +e.latlng.lat.toFixed(5), longitude: +e.latlng.lng.toFixed(5) }) })
  return null
}

/**
 * Encontra a sede da fazenda: busca por nome do lugar (Nominatim/OpenStreetMap, gratuito),
 * GPS do aparelho ou toque no mapa. O marcador pode ser arrastado para ajustar.
 */
export function LocalizarFazenda({ valor, onChange, sugestao, alternativa }: { valor?: Posicao; onChange: (p: Posicao) => void; sugestao?: string; alternativa?: string }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [localizando, setLocalizando] = useState(false)
  const [erro, setErro] = useState<string>()

  async function buscar() {
    const q = (termo || sugestao || '').trim()
    if (!q) return setErro('Digite o nome da fazenda, distrito ou cidade')
    setErro(undefined)
    setBuscando(true)
    try {
      // Política do Nominatim: busca só ao confirmar (sem autocompletar a cada tecla).
      const consultar = async (texto: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=br&limit=5&accept-language=pt-BR&q=${encodeURIComponent(texto)}`
        return (await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).json()) as Resultado[]
      }
      let r = await consultar(q)
      // Fazendas raramente estão no mapa pelo nome: sem resultado, tenta a cidade.
      if (r.length === 0 && !termo.trim() && alternativa) r = await consultar(alternativa)
      setResultados(r)
      if (r.length === 0) setErro('Nada encontrado. Tente a cidade ou o distrito e ajuste o marcador no mapa.')
      else if (r.length === 1) escolher(r[0])
    } catch {
      setErro('Busca indisponível sem internet. Use o GPS ou toque no mapa.')
    } finally {
      setBuscando(false)
    }
  }

  function escolher(r: Resultado) {
    onChange({ latitude: +(+r.lat).toFixed(5), longitude: +(+r.lon).toFixed(5) })
    setResultados([])
  }

  function gps() {
    if (!navigator.geolocation) return setErro('Este aparelho não informa a localização')
    setLocalizando(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({ latitude: +p.coords.latitude.toFixed(5), longitude: +p.coords.longitude.toFixed(5) })
        setLocalizando(false)
      },
      () => {
        setErro('Não foi possível obter a localização do aparelho.')
        setLocalizando(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  const enter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void buscar()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={enter} placeholder={sugestao || 'Fazenda, distrito ou cidade'} className="pl-9" aria-label="Buscar local" />
        </div>
        <Button type="button" variant="secondary" carregando={buscando} onClick={buscar}>
          Buscar
        </Button>
        <Button type="button" variant="secondary" icon={LocateFixed} carregando={localizando} onClick={gps} aria-label="Usar minha localização" title="Usar minha localização" />
      </div>

      {resultados.length > 1 && (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-md border border-stone-200">
          {resultados.map((r) => (
            <li key={r.lat + r.lon}>
              <button type="button" onClick={() => escolher(r)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                <span className="line-clamp-2 text-stone-700">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative isolate h-56 overflow-hidden rounded-md border border-stone-200">
        <MapContainer center={valor ? [valor.latitude, valor.longitude] : [-15.8, -47.9]} zoom={valor ? 14 : 4} className="h-full w-full">
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" maxZoom={19} />
          <CliqueNoMapa onEscolher={onChange} />
          <Centralizar pos={valor} />
          {valor && (
            <Marker
              position={[valor.latitude, valor.longitude]}
              icon={marcador}
              draggable
              eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange({ latitude: +p.lat.toFixed(5), longitude: +p.lng.toFixed(5) }) } }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-stone-500">
        {valor ? `Sede em ${valor.latitude}, ${valor.longitude}. Arraste o marcador ou toque no mapa para ajustar.` : 'Busque o local, use o GPS ou toque no mapa onde fica a sede.'}
      </p>
      {erro && <p className="text-xs text-amber-700">{erro}</p>}
    </div>
  )
}
