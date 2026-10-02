import { ArrowLeft, MapPin, Table2, LineChart } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, Carregando, Segmentado, Vazio } from '@/components/ui'
import { fmtDataHora, fmtNumero, fmtRelativo, TIPOS_DISPOSITIVO } from '@/lib/format'
import type { Dispositivo, Leitura, Talhao } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { Bateria, ICONE_TIPO, Reconciliacao, StatusOnline } from './componentes'
import { useTalhoes } from '../colheitas/hooks'
import { SerieChart } from './SerieChart'
import { TrajetoMapa } from './TrajetoMapa'

type Periodo = '24' | '72'
type Visao = 'grafico' | 'tabela'

function Graficos({ d, leituras, talhoes }: { d: Dispositivo; leituras: Leitura[]; talhoes: Talhao[] }) {
  switch (d.tipo) {
    case 'ESTACAO_METEOROLOGICA':
      return (
        <>
          <SerieChart titulo="Temperatura do ar" unidade="°C" campo="temperatura" dados={leituras} limite={{ valor: 3, rotulo: 'risco de geada' }} />
          <SerieChart titulo="Umidade relativa do ar" unidade="%" campo="umidadeAr" dados={leituras} dominio={[0, 100]} />
        </>
      )
    case 'SENSOR_SOLO':
      return (
        <>
          <SerieChart titulo="Umidade volumétrica do solo" unidade="%" campo="umidadeSolo" dados={leituras} limite={{ valor: 25, rotulo: 'irrigar abaixo de 25%' }} dominio={[0, 60]} />
          <SerieChart titulo="Temperatura do solo" unidade="°C" campo="temperatura" dados={leituras} />
        </>
      )
    case 'SENSOR_SILO':
      return (
        <>
          <SerieChart titulo="Temperatura da massa de grãos" unidade="°C" campo="temperatura" dados={leituras} limite={{ valor: 30, rotulo: 'aeração acima de 30 °C' }} />
          <SerieChart titulo="Nível do silo" unidade="%" campo="nivelPercentual" dados={leituras} dominio={[0, 100]} />
        </>
      )
    case 'RASTREADOR_MAQUINA':
      return (
        <>
          <TrajetoMapa leituras={leituras} talhoes={talhoes} />
          <SerieChart titulo="Velocidade" unidade="km/h" campo="velocidade" dados={leituras} dominio={[0, 'auto']} />
        </>
      )
  }
}

const COLUNAS: Record<Dispositivo['tipo'], [string, (l: Leitura) => number | boolean | undefined][]> = {
  ESTACAO_METEOROLOGICA: [['Temp. (°C)', (l) => l.temperatura], ['UR ar (%)', (l) => l.umidadeAr]],
  SENSOR_SOLO: [['Solo (%)', (l) => l.umidadeSolo], ['Temp. (°C)', (l) => l.temperatura]],
  SENSOR_SILO: [['Nível (%)', (l) => l.nivelPercentual], ['Temp. (°C)', (l) => l.temperatura]],
  RASTREADOR_MAQUINA: [['Lat.', (l) => l.latitude], ['Lon.', (l) => l.longitude], ['Vel. (km/h)', (l) => l.velocidade], ['Operando', (l) => l.operando]],
}

function Tabela({ tipo, leituras }: { tipo: Dispositivo['tipo']; leituras: Leitura[] }) {
  const colunas: [string, (l: Leitura) => number | boolean | undefined][] = [...COLUNAS[tipo], ['Bateria (%)', (l) => l.bateria], ['RSSI (dBm)', (l) => l.rssi]]
  const linhas = [...leituras].reverse().slice(0, 100)
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white lg:col-span-2">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left text-xs text-stone-500">
          <tr>
            {['Horário', ...colunas.map(([h]) => h)].map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 tabular-nums">
          {linhas.map((l) => (
            <tr key={l.medidoEm}>
              <td className="whitespace-nowrap px-3 py-1.5">{fmtDataHora(l.medidoEm)}</td>
              {colunas.map(([, valor], i) => {
                const v = valor(l)
                return <td key={i} className="px-3 py-1.5">{v == null ? '—' : typeof v === 'boolean' ? (v ? 'sim' : 'não') : fmtNumero(v)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DispositivoDetalhe() {
  const id = Number(useParams().id)
  const [periodo, setPeriodo] = useState<Periodo>('24')
  const [visao, setVisao] = useState<Visao>('grafico')
  const { data: dispositivos, isLoading } = useDados<Dispositivo[]>('/iot/dispositivos', { refetchInterval: 30_000 })
  const leituras = useDados<Leitura[]>(`/iot/dispositivos/${id}/leituras?horas=${periodo}`, { refetchInterval: 15_000 })
  const { data: talhoes = [] } = useTalhoes()

  const d = dispositivos?.find((x) => x.id === id)
  if (isLoading) return <Carregando />
  if (!d) return <Vazio icon={MapPin} titulo="Dispositivo não encontrado" />
  const Icone = ICONE_TIPO[d.tipo]

  return (
    <>
      <Link to="/campo" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> Campo conectado
      </Link>

      <Card className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-sky-50 p-3 text-sky-700">
            <Icone className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{d.nome}</h1>
            <p className="text-sm text-stone-500">
              {d.codigo} · {TIPOS_DISPOSITIVO[d.tipo]} · firmware {d.firmwareVersao ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <StatusOnline online={d.online} />
          <span className="text-xs text-stone-500">Último contato {fmtRelativo(d.ultimoContato)}</span>
          <Bateria valor={d.bateria} />
        </div>
        {d.latitude != null && d.longitude != null && (
          <a
            className="inline-flex w-full items-center gap-1 text-xs text-brand-700 hover:underline"
            href={`https://www.openstreetmap.org/?mlat=${d.latitude}&mlon=${d.longitude}#map=16/${d.latitude}/${d.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin className="h-3.5 w-3.5" /> {d.tipo === 'RASTREADOR_MAQUINA' ? 'Última posição' : d.localizacao} ({d.latitude.toFixed(4)}, {d.longitude.toFixed(4)})
          </a>
        )}
      </Card>

      {d.silo && (
        <div className="mb-4">
          <Reconciliacao r={d.silo} />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="w-48">
          <Segmentado<Periodo> valor={periodo} onChange={setPeriodo} opcoes={[{ valor: '24', label: '24 h' }, { valor: '72', label: '72 h' }]} />
        </div>
        <div className="flex rounded-xl bg-stone-100 p-1">
          {([['grafico', LineChart, 'Gráfico'], ['tabela', Table2, 'Tabela']] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              aria-pressed={visao === v}
              className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm ${visao === v ? 'bg-white shadow-sm' : 'text-stone-600'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {leituras.isLoading ? (
        <Carregando />
      ) : !leituras.data?.length ? (
        <Vazio icon={LineChart} titulo="Sem leituras no período" texto={d.online ? undefined : 'O dispositivo está offline; ao reconectar ele envia o que guardou no buffer.'} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visao === 'grafico' ? <Graficos d={d} leituras={leituras.data} talhoes={talhoes} /> : <Tabela tipo={d.tipo} leituras={leituras.data} />}
        </div>
      )}

      <Card className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-stone-700">Integração do firmware</h2>
        <p className="mb-2 text-xs text-stone-500">
          O dispositivo envia lotes com chaves curtas para economizar banda. Exemplo do payload deste sensor:
        </p>
        <pre className="overflow-x-auto rounded-xl bg-stone-900 p-3 text-xs leading-relaxed text-stone-100">
{`POST /api/iot/telemetria
X-Device-Key: <chave do dispositivo>

{
  "codigo": "${d.codigo}",
  "firmware": "${d.firmwareVersao ?? '1.0.0'}",
  "leituras": [
    { "ts": ${Math.floor(Date.now() / 1000)}, ${
      d.tipo === 'RASTREADOR_MAQUINA'
        ? '"lat": -24.8786, "lon": -53.5489, "vel": 6.5, "op": true'
        : `"t": 24.6, ${d.tipo === 'SENSOR_SOLO' ? '"us": 31.2' : d.tipo === 'SENSOR_SILO' ? '"nivel": 72.4' : '"ur": 64'}`
    }, "bat": 87, "rssi": -78 }
  ]
}`}
        </pre>
      </Card>
    </>
  )
}
