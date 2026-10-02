import { clsx } from 'clsx'
import { ATIVIDADES } from '@/lib/format'
import type { Alocacao, SituacaoOperador } from '@/lib/types'

export function iniciais(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export function Avatar({ nome, situacao }: { nome: string; situacao: SituacaoOperador }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700 ring-1 ring-inset ring-stone-200">
      {iniciais(nome)}
      <span
        className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white', { DISPONIVEL: 'bg-brand-500', EM_ATIVIDADE: 'bg-sky-500', AUSENTE: 'bg-stone-400' }[situacao])}
        aria-hidden
      />
    </span>
  )
}

/** Resumo da atividade: "Colheita · CH-01 · talhão T-04". */
export function resumoAtividade(a: Alocacao) {
  return [ATIVIDADES[a.atividade], a.veiculoIdentificacao, a.talhaoCodigo && `talhão ${a.talhaoCodigo}`].filter(Boolean).join(' · ')
}
