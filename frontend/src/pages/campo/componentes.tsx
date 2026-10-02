import { clsx } from 'clsx'
import { AlertOctagon, AlertTriangle, BatteryLow, BatteryMedium, BatteryFull, CloudSun, Droplets, Info, Warehouse, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui'
import { fmtNumero } from '@/lib/format'
import type { Dispositivo, ReconciliacaoSilo, SeveridadeAlerta, TipoDispositivo } from '@/lib/types'

export const ICONE_TIPO: Record<TipoDispositivo, typeof CloudSun> = {
  ESTACAO_METEOROLOGICA: CloudSun,
  SENSOR_SOLO: Droplets,
  SENSOR_SILO: Warehouse,
}

export function StatusOnline({ online }: { online: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', online ? 'text-brand-700' : 'text-stone-500')}>
      <span className={clsx('h-2 w-2 rounded-full', online ? 'bg-brand-500' : 'bg-stone-400')} aria-hidden />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}

export function Bateria({ valor }: { valor?: number }) {
  if (valor == null) return null
  const Icone = valor <= 20 ? BatteryLow : valor <= 60 ? BatteryMedium : BatteryFull
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs', valor <= 20 ? 'font-medium text-red-600' : 'text-stone-500')}>
      <Icone className="h-4 w-4" aria-hidden /> {fmtNumero(Math.round(valor))}%
    </span>
  )
}

/** Qualidade do sinal pelo RSSI (dBm) — útil para posicionar antenas/gateways no campo. */
export function Sinal({ rssi }: { rssi?: number }) {
  if (rssi == null) return null
  const qualidade = rssi > -70 ? 'bom' : rssi > -85 ? 'regular' : 'fraco'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-500" title={`${rssi} dBm`}>
      <Wifi className="h-3.5 w-3.5" aria-hidden /> sinal {qualidade}
    </span>
  )
}

const severidade: Record<SeveridadeAlerta, { tom: 'vermelho' | 'amarelo' | 'azul'; icon: typeof Info; label: string }> = {
  CRITICO: { tom: 'vermelho', icon: AlertOctagon, label: 'Crítico' },
  AVISO: { tom: 'amarelo', icon: AlertTriangle, label: 'Aviso' },
  INFO: { tom: 'azul', icon: Info, label: 'Info' },
}

export function SeveridadeBadge({ s }: { s: SeveridadeAlerta }) {
  const { tom, icon: Icon, label } = severidade[s]
  return (
    <Badge tom={tom}>
      <Icon className="h-3 w-3" aria-hidden /> {label}
    </Badge>
  )
}

/** Medido pelo sensor × registrado no estoque, ambos em kg na mesma escala. */
export function Reconciliacao({ r }: { r: ReconciliacaoSilo }) {
  const max = Math.max(r.capacidadeKg, r.medidoKg, r.registradoKg)
  const linhas = [
    { label: 'Medido no silo', valor: r.medidoKg, cor: 'bg-[#2a78d6]' },
    { label: 'Registrado no estoque', valor: r.registradoKg, cor: 'bg-stone-400' },
  ]
  return (
    <div className={clsx('rounded-xl p-3', r.divergente ? 'bg-amber-50' : 'bg-stone-50')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-600">Silo × estoque · {r.produtoNome}</span>
        {r.divergenciaPercentual != null && (
          <Badge tom={r.divergente ? 'amarelo' : 'verde'}>
            {r.divergente && <AlertTriangle className="h-3 w-3" aria-hidden />}
            {r.divergenciaPercentual > 0 ? '+' : ''}
            {fmtNumero(r.divergenciaPercentual)}%
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.label}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-stone-600">{l.label}</span>
              <span className="font-medium tabular-nums text-stone-900">{fmtNumero(l.valor / 1000)} t</span>
            </div>
            <div className="h-2 rounded-full bg-white">
              <div className={clsx('h-full rounded-full', l.cor)} style={{ width: `${(l.valor / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {r.divergente && (
        <p className="mt-2 text-xs text-amber-900">
          Diferença acima de 10%: verifique perdas, desvio ou lançamentos de saída não registrados.
        </p>
      )}
    </div>
  )
}

/** Valores principais da última leitura, conforme o tipo do dispositivo. */
export function ResumoLeitura({ d }: { d: Dispositivo }) {
  const l = d.ultimaLeitura
  if (!l) return <p className="text-sm text-stone-500">Sem leituras.</p>
  const itens =
    d.tipo === 'ESTACAO_METEOROLOGICA'
      ? [['Temperatura', l.temperatura, '°C'], ['Umidade do ar', l.umidadeAr, '%']]
      : d.tipo === 'SENSOR_SOLO'
        ? [['Umidade do solo', l.umidadeSolo, '%'], ['Temp. do solo', l.temperatura, '°C']]
        : [['Nível', l.nivelPercentual, '%'], ['Temp. da massa', l.temperatura, '°C']]
  return (
    <dl className="grid grid-cols-2 gap-2">
      {itens.map(([label, valor, un]) => (
        <div key={label as string} className="rounded-xl bg-stone-50 p-2">
          <dt className="text-xs text-stone-500">{label}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {valor == null ? '—' : `${fmtNumero(valor as number)} ${un}`}
          </dd>
        </div>
      ))}
    </dl>
  )
}
