import { ArrowRight, BellRing, Check, Cpu, Radio, RadioTower, Server, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Card, Carregando, Erro, PageHeader, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'
import { fmtRelativo, TIPOS_DISPOSITIVO } from '@/lib/format'
import type { AlertaIot, Dispositivo } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { useSync } from '@/offline/SyncContext'
import { Bateria, ICONE_TIPO, Reconciliacao, ResumoLeitura, SeveridadeBadge, Sinal, StatusOnline } from './componentes'

const ATUALIZACAO_MS = 30_000

/** Caminho do dado, do sensor ao painel. */
function Arquitetura() {
  const etapas = [
    { icon: Cpu, titulo: 'Sensores + ESP32', texto: 'Solo, clima e nível/temperatura do silo. Deep sleep entre leituras.' },
    { icon: RadioTower, titulo: 'LoRa / Wi-Fi / 4G', texto: 'Sem sinal, as leituras ficam no buffer do dispositivo e vão em lote depois.' },
    { icon: Server, titulo: 'API GreenAgri', texto: 'Autentica a chave do dispositivo, descarta duplicadas e aplica as regras.' },
    { icon: BellRing, titulo: 'Alertas e estoque', texto: 'Geada, solo seco, grão aquecendo e divergência silo × estoque.' },
  ]
  return (
    <Card className="mb-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-700">Como funciona</h2>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {etapas.map(({ icon: Icon, titulo, texto }, i) => (
          <li key={titulo} className="relative flex gap-3 rounded-xl bg-stone-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-800">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">
                {i + 1}. {titulo}
              </p>
              <p className="text-xs text-stone-500">{texto}</p>
            </div>
            {i < etapas.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-stone-400 lg:block" aria-hidden />}
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Alertas({ alertas }: { alertas: AlertaIot[] }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { online } = useSync()

  async function reconhecer(id: number) {
    try {
      await api(`/iot/alertas/${id}/reconhecer`, { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['/iot/alertas'] })
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Erro ao reconhecer alerta')
    }
  }

  if (alertas.length === 0) return null
  return (
    <Card className="mb-5">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-700">
        <BellRing className="h-4 w-4" /> Alertas abertos ({alertas.length})
      </h2>
      <ul className="divide-y divide-stone-100">
        {alertas.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2.5">
            <SeveridadeBadge s={a.severidade} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-stone-900">{a.mensagem}</p>
              <p className="text-xs text-stone-500">
                {a.dispositivoNome} · {fmtRelativo(a.criadoEm)}
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={Check} onClick={() => reconhecer(a.id)} disabled={!online} title="Marcar como visto">
              <span className="hidden sm:inline">Ciente</span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function DispositivoCard({ d }: { d: Dispositivo }) {
  const Icone = ICONE_TIPO[d.tipo]
  return (
    <Link to={`/campo/${d.id}`} className="group min-w-0">
      <Card className="flex h-full flex-col gap-3 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
              <Icone className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium group-hover:text-brand-800">{d.nome}</p>
              <p className="text-xs text-stone-500">
                {d.codigo} · {TIPOS_DISPOSITIVO[d.tipo]}
              </p>
            </div>
          </div>
          <StatusOnline online={d.online} />
        </div>
        <ResumoLeitura d={d} />
        {d.silo && <Reconciliacao r={d.silo} />}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          <Bateria valor={d.bateria} />
          <Sinal rssi={d.ultimaLeitura?.rssi} />
          <span className="ml-auto text-xs text-stone-400">{fmtRelativo(d.ultimoContato)}</span>
        </div>
      </Card>
    </Link>
  )
}

export default function Campo() {
  const dispositivos = useDados<Dispositivo[]>('/iot/dispositivos', { refetchInterval: ATUALIZACAO_MS })
  const alertas = useDados<AlertaIot[]>('/iot/alertas', { refetchInterval: ATUALIZACAO_MS })
  const lista = dispositivos.data ?? []
  const online = lista.filter((d) => d.online).length

  return (
    <>
      <PageHeader
        titulo="Campo conectado"
        subtitulo="Telemetria dos dispositivos embarcados (ESP32) espalhados pela fazenda"
        acoes={
          <Badge tom={online === lista.length ? 'verde' : 'amarelo'} className="h-8 px-3 text-sm">
            <Wifi className="h-4 w-4" /> {online}/{lista.length} online
          </Badge>
        }
      />
      <Arquitetura />
      <Alertas alertas={alertas.data ?? []} />
      {dispositivos.isLoading ? (
        <Carregando />
      ) : dispositivos.error ? (
        <Erro erro={dispositivos.error} onTentar={dispositivos.refetch} />
      ) : lista.length === 0 ? (
        <Vazio icon={Radio} titulo="Nenhum dispositivo provisionado" texto="Cadastre um dispositivo pela API (POST /api/iot/dispositivos) e grave a chave no firmware." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((d) => (
            <DispositivoCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </>
  )
}
