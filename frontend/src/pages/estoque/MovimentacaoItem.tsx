import { clsx } from 'clsx'
import { ArrowDownLeft, ArrowUpRight, ClipboardCheck, CloudOff } from 'lucide-react'
import { Badge } from '@/components/ui'
import { fmtDataHora, fmtQtd, TIPOS_MOVIMENTACAO } from '@/lib/format'
import type { Movimentacao } from '@/lib/types'

const estilo = {
  ENTRADA: { icon: ArrowDownLeft, cor: 'bg-brand-100 text-brand-700', sinal: '+' },
  SAIDA: { icon: ArrowUpRight, cor: 'bg-orange-100 text-orange-700', sinal: '−' },
  AJUSTE: { icon: ClipboardCheck, cor: 'bg-sky-100 text-sky-700', sinal: '=' },
}

export function MovimentacaoItem({ m, mostrarProduto = true }: { m: Movimentacao; mostrarProduto?: boolean }) {
  const { icon: Icon, cor, sinal } = estilo[m.tipo]
  return (
    <li className={clsx('flex items-start gap-3 py-3', m.pendente && 'opacity-80')}>
      <span className={clsx('mt-0.5 rounded-xl p-2', cor)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-stone-900">{mostrarProduto ? m.produtoNome : TIPOS_MOVIMENTACAO[m.tipo]}</p>
          {m.pendente && (
            <Badge tom="amarelo">
              <CloudOff className="h-3 w-3" /> na fila
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-stone-500">
          {mostrarProduto && `${TIPOS_MOVIMENTACAO[m.tipo]} · `}
          {m.motivo || 'Sem motivo informado'}
        </p>
        <p className="text-xs text-stone-400">
          {fmtDataHora(m.ocorridoEm)}
          {m.responsavel && ` · ${m.responsavel}`}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-stone-900">
          {sinal} {fmtQtd(m.quantidade, m.unidade)}
        </p>
        <p className="text-xs tabular-nums text-stone-500">saldo {fmtQtd(m.saldoApos, m.unidade)}</p>
      </div>
    </li>
  )
}
