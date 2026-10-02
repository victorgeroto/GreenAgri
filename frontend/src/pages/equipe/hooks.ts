import { useMemo } from 'react'
import { ATIVIDADES } from '@/lib/format'
import type { Alocacao, AlocacaoInput, Operador, Talhao, Veiculo } from '@/lib/types'
import { useDados, useEscrita } from '@/offline/hooks'
import { useSync } from '@/offline/SyncContext'

export const CAMINHO_ALOCACOES = '/equipe/alocacoes'
const ENCERRAR = /^\/equipe\/alocacoes\/(\d+)\/encerrar$/

interface Contexto {
  veiculos: Veiculo[]
  talhoes: Talhao[]
}

/**
 * Operadores do servidor com a fila offline aplicada por cima: alocações
 * pendentes já mostram o operador "em atividade" e encerramentos pendentes
 * já o liberam, para a tela refletir o que o usuário acabou de fazer.
 */
export function useEquipe({ veiculos, talhoes }: Contexto) {
  const operadores = useDados<Operador[]>('/equipe/operadores', { refetchInterval: 60_000 })
  const { fila } = useSync()

  const dados = useMemo(() => {
    const pendentesFila = fila.filter((i) => i.status === 'pendente')
    const encerrando = new Set(
      pendentesFila.map((i) => ENCERRAR.exec(i.caminho)?.[1]).filter(Boolean).map(Number),
    )
    const novas = new Map<number, Alocacao>()
    for (const i of pendentesFila) {
      if (i.metodo !== 'POST' || i.caminho !== CAMINHO_ALOCACOES) continue
      const c = i.corpo as AlocacaoInput
      const v = veiculos.find((x) => x.id === c.veiculoId)
      novas.set(c.operadorId, {
        id: -i.id!,
        operadorId: c.operadorId,
        operadorNome: '',
        atividade: c.atividade,
        veiculoId: c.veiculoId,
        veiculoIdentificacao: v?.identificacao,
        veiculoModelo: v?.modelo,
        veiculoTipo: v?.tipo,
        talhaoId: c.talhaoId,
        talhaoCodigo: talhoes.find((t) => t.id === c.talhaoId)?.codigo,
        descricao: c.descricao,
        inicio: new Date(i.criadoEm).toISOString(),
        previsaoFim: c.previsaoFim,
        idCliente: c.idCliente,
        pendente: true,
      })
    }

    const lista: Operador[] = (operadores.data ?? []).map((o) => {
      if (o.alocacaoAtual && encerrando.has(o.alocacaoAtual.id)) {
        return { ...o, situacao: 'DISPONIVEL', alocacaoAtual: undefined }
      }
      const nova = novas.get(o.id)
      if (nova && o.situacao === 'DISPONIVEL') {
        return { ...o, situacao: 'EM_ATIVIDADE', alocacaoAtual: { ...nova, operadorNome: o.nome } }
      }
      return o
    })
    // Máquina ocupada → alocação (inclui as que estão só na fila).
    const porVeiculo = new Map<number, Alocacao>()
    for (const o of lista) if (o.alocacaoAtual?.veiculoId) porVeiculo.set(o.alocacaoAtual.veiculoId, o.alocacaoAtual)
    return { lista, porVeiculo, encerrando }
  }, [operadores.data, fila, veiculos, talhoes])

  return { ...operadores, operadores: dados.lista, alocacaoPorVeiculo: dados.porVeiculo, encerrando: dados.encerrando }
}

export function useAlocar() {
  return useEscrita<AlocacaoInput & { operadorNome: string; alvo: string }, Alocacao>(({ operadorNome, alvo, ...corpo }) => ({
    metodo: 'POST',
    caminho: CAMINHO_ALOCACOES,
    corpo,
    descricao: `${operadorNome} → ${ATIVIDADES[corpo.atividade]}${alvo ? ` · ${alvo}` : ''}`,
  }))
}

export function useEncerrar() {
  return useEscrita<{ alocacao: Alocacao; operadorNome: string }, Alocacao>(({ alocacao, operadorNome }) => ({
    metodo: 'POST',
    caminho: `${CAMINHO_ALOCACOES}/${alocacao.id}/encerrar`,
    descricao: `Encerrar ${ATIVIDADES[alocacao.atividade].toLowerCase()} de ${operadorNome}`,
  }))
}
