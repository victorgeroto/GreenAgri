import { useMemo } from 'react'
import type { Colheita, ColheitaInput, EventoColheita, StatusColheita, Talhao, TalhaoInput } from '@/lib/types'
import { STATUS_COLHEITA } from '@/lib/format'
import type { ItemFila } from '@/offline/db'
import { useDados, useEscrita } from '@/offline/hooks'
import { useSync } from '@/offline/SyncContext'

const CAMINHO_STATUS = /^\/colheitas\/(\d+)\/(status|concluir)$/

/**
 * Mudanças de status ainda na fila offline, aplicadas por cima da lista do
 * servidor — o mapa já mostra o talhão "em colheita" mesmo sem sinal.
 */
export function aplicarStatusPendentes(colheitas: Colheita[], fila: ItemFila[]): Colheita[] {
  const pendentes = new Map<number, StatusColheita>()
  for (const item of fila) {
    const m = item.status === 'pendente' && item.metodo === 'POST' ? CAMINHO_STATUS.exec(item.caminho) : null
    if (m) pendentes.set(Number(m[1]), m[2] === 'concluir' ? 'CONCLUIDA' : (item.corpo as { status: StatusColheita }).status)
  }
  if (pendentes.size === 0) return colheitas
  return colheitas.map((c) => (pendentes.has(c.id) ? { ...c, status: pendentes.get(c.id)!, statusPendente: true } : c))
}

export function useColheitas() {
  const query = useDados<Colheita[]>('/colheitas', { refetchInterval: 20_000 })
  const { fila } = useSync()
  const colheitas = useMemo(() => aplicarStatusPendentes(query.data ?? [], fila), [query.data, fila])
  const safras = useMemo(() => [...new Set(colheitas.map((c) => c.safra))].sort().reverse(), [colheitas])
  return { ...query, colheitas, safras }
}

export const useTalhoes = () => useDados<Talhao[]>('/talhoes')

export const useEventos = (colheitaId?: number) =>
  useDados<EventoColheita[]>(`/colheitas/${colheitaId}/eventos`, { enabled: !!colheitaId })

/** Próximo passo manual do ciclo (a conclusão tem formulário próprio). */
export function proximoStatus(s: StatusColheita): { status: StatusColheita; acao: string } | null {
  switch (s) {
    case 'PLANEJADA':
      return { status: 'EM_DESENVOLVIMENTO', acao: 'Registrar plantio' }
    case 'EM_DESENVOLVIMENTO':
      return { status: 'EM_COLHEITA', acao: 'Iniciar colheita' }
    default:
      return null
  }
}

export function useMudarStatus() {
  return useEscrita<{ colheita: Colheita; status: StatusColheita; observacao?: string }>(({ colheita, status, observacao }) => ({
    metodo: 'POST',
    caminho: `/colheitas/${colheita.id}/status`,
    corpo: { status, observacao },
    descricao: `${colheita.cultura} (${colheita.talhao}) → ${STATUS_COLHEITA[status]}`,
  }))
}

export function useSalvarColheita(id?: number) {
  return useEscrita<ColheitaInput & { talhaoCodigo: string }>(({ talhaoCodigo, ...c }) => ({
    metodo: id ? 'PUT' : 'POST',
    caminho: id ? `/colheitas/${id}` : '/colheitas',
    corpo: c,
    descricao: `${id ? 'Edição' : 'Cadastro'} da colheita ${c.cultura} (${talhaoCodigo})`,
  }))
}

export function useSalvarTalhao() {
  return useEscrita<TalhaoInput, Talhao>((t) => ({
    metodo: 'POST',
    caminho: '/talhoes',
    corpo: t,
    descricao: `Cadastro do talhão ${t.codigo}`,
  }))
}
