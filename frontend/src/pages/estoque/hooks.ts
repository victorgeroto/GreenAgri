import { useMemo } from 'react'
import type { Movimentacao, MovimentacaoInput, Produto, ProdutoInput } from '@/lib/types'
import { useDados, useEscrita } from '@/offline/hooks'
import { aplicarPendentes, CAMINHO_MOVIMENTACOES, historicoComPendentes, movimentacoesPendentes } from '@/offline/pendentes'
import { useSync } from '@/offline/SyncContext'
import { TIPOS_MOVIMENTACAO } from '@/lib/format'

/** Produtos do servidor com os lançamentos da fila offline já refletidos no saldo. */
export function useProdutos() {
  const query = useDados<Produto[]>('/produtos')
  const { fila } = useSync()
  const pendentes = useMemo(() => movimentacoesPendentes(fila), [fila])
  const produtos = useMemo(() => aplicarPendentes(query.data ?? [], pendentes), [query.data, pendentes])
  const comPendencia = useMemo(() => new Set(pendentes.map((m) => m.produtoId)), [pendentes])
  return { ...query, produtos, comPendencia, servidor: query.data ?? [] }
}

export function useHistorico(produtoId?: number) {
  const caminho = `${CAMINHO_MOVIMENTACOES}${produtoId ? `?produtoId=${produtoId}` : '?limite=200'}`
  const query = useDados<Movimentacao[]>(caminho)
  const { servidor } = useProdutos()
  const { fila } = useSync()
  const linhas = useMemo(() => {
    const pendentes = movimentacoesPendentes(fila).filter((m) => !produtoId || m.produtoId === produtoId)
    return historicoComPendentes(query.data ?? [], pendentes, servidor)
  }, [query.data, fila, servidor, produtoId])
  return { ...query, linhas }
}

export function useMovimentar() {
  return useEscrita<MovimentacaoInput & { produtoNome: string }, Movimentacao>(({ produtoNome, ...mov }) => ({
    metodo: 'POST',
    caminho: CAMINHO_MOVIMENTACOES,
    corpo: mov,
    descricao: `${TIPOS_MOVIMENTACAO[mov.tipo]} de ${mov.quantidade} · ${produtoNome}`,
  }))
}

export function useSalvarProduto(id?: number) {
  return useEscrita<ProdutoInput, Produto>((p) => ({
    metodo: id ? 'PUT' : 'POST',
    caminho: id ? `/produtos/${id}` : '/produtos',
    corpo: p,
    descricao: `${id ? 'Edição' : 'Cadastro'} do produto ${p.nome}`,
  }))
}
