import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Leitura } from '@/lib/types'
import { fmtDataHora, fmtNumero } from '@/lib/format'

// Papéis visuais do gráfico (série única: a cor identifica a série, o título nomeia).
const COR_SERIE = '#2a78d6'
const GRADE = '#e7e5e4'
const TEXTO_SECUNDARIO = '#57534e'

interface Props {
  titulo: string
  unidade: string
  dados: Leitura[]
  campo: keyof Pick<Leitura, 'temperatura' | 'umidadeAr' | 'umidadeSolo' | 'nivelPercentual' | 'bateria' | 'velocidade'>
  limite?: { valor: number; rotulo: string }
  dominio?: [number | 'auto', number | 'auto']
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function SerieChart({ titulo, unidade, dados, campo, limite, dominio = ['auto', 'auto'] }: Props) {
  const pontos = dados.filter((d) => d[campo] != null).map((d) => ({ t: d.medidoEm, v: d[campo] as number }))
  const atual = pontos.at(-1)?.v

  return (
    <figure className="rounded-lg border border-stone-200 bg-white p-4">
      <figcaption className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-stone-700">{titulo}</span>
        <span className="text-lg font-semibold tabular-nums text-stone-900">
          {atual == null ? '—' : `${fmtNumero(atual)} ${unidade}`}
        </span>
      </figcaption>
      <div className="h-44" role="img" aria-label={`${titulo}: ${pontos.length} leituras, valor atual ${atual ?? 'indisponível'} ${unidade}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRADE} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={hora}
              minTickGap={48}
              tick={{ fontSize: 11, fill: TEXTO_SECUNDARIO }}
              axisLine={{ stroke: GRADE }}
              tickLine={false}
            />
            <YAxis
              domain={dominio}
              tick={{ fontSize: 11, fill: TEXTO_SECUNDARIO }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => fmtNumero(v)}
            />
            {limite && (
              <ReferenceLine
                y={limite.valor}
                stroke={TEXTO_SECUNDARIO}
                strokeWidth={1}
                label={{ value: limite.rotulo, position: 'insideTopRight', fontSize: 11, fill: TEXTO_SECUNDARIO }}
              />
            )}
            <Tooltip
              cursor={{ stroke: TEXTO_SECUNDARIO, strokeWidth: 1 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="text-stone-500">{fmtDataHora(payload[0].payload.t)}</p>
                    <p className="font-semibold text-stone-900">
                      {fmtNumero(payload[0].value as number)} {unidade}
                    </p>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={COR_SERIE}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={COR_SERIE}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2, fill: COR_SERIE }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
