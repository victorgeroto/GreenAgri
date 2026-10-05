import type { Movimentacao, MovimentacaoInput, Produto } from '@/lib/types'
import type { ItemFila } from './db'

export const CAMINHO_MOVIMENTACOES = '/estoque/movimentacoes'

/** Movimentações de estoque que ainda estão na fila local (não falhadas). */
export function movimentacoesPendentes(fila: ItemFila[]): MovimentacaoInput[] {
  return fila
    .filter((i) => i.status === 'pendente' && i.metodo === 'POST' && i.caminho === CAMINHO_MOVIMENTACOES)
    .map((i) => i.corpo as MovimentacaoInput)
}

function aplicar(saldo: number, mov: MovimentacaoInput) {
  switch (mov.tipo) {
    case 'ENTRADA':
      return saldo + mov.quantidade
    case 'SAIDA':
      return saldo - mov.quantidade
    case 'AJUSTE':
      return mov.quantidade
  }
}

/**
 * Projeta o saldo que o usuário verá após a sincronização: dados do
 * servidor + lançamentos pendentes aplicados na ordem em que foram feitos.
 */
export function aplicarPendentes(produtos: Produto[], pendentes: MovimentacaoInput[]): Produto[] {
  if (pendentes.length === 0) return produtos
  return produtos.map((p) => {
    const doProduto = pendentes.filter((m) => m.produtoId === p.id)
    if (doProduto.length === 0) return p
    const quantidadeAtual = doProduto.reduce(aplicar, p.quantidadeAtual)
    return { ...p, quantidadeAtual, abaixoDoMinimo: quantidadeAtual < p.estoqueMinimo }
  })
}

/** Converte lançamentos pendentes em linhas do histórico, marcadas como pendentes. */
export function historicoComPendentes(
  historico: Movimentacao[],
  pendentes: MovimentacaoInput[],
  produtos: Produto[],
): Movimentacao[] {
  const jaNoServidor = new Set(historico.map((m) => m.idCliente).filter(Boolean))
  const saldos = new Map(produtos.map((p) => [p.id, p.quantidadeAtual]))
  const linhas = pendentes
    .filter((m) => !jaNoServidor.has(m.idCliente))
    .map((m, i): Movimentacao => {
      const produto = produtos.find((p) => p.id === m.produtoId)
      const saldoApos = aplicar(saldos.get(m.produtoId) ?? 0, m)
      saldos.set(m.produtoId, saldoApos)
      return {
        id: -(i + 1),
        produtoId: m.produtoId,
        produtoNome: produto?.nome ?? `Produto #${m.produtoId}`,
        unidade: produto?.unidade ?? 'UNIDADE',
        tipo: m.tipo,
        quantidade: m.quantidade,
        saldoApos,
        motivo: m.motivo,
        idCliente: m.idCliente,
        foto: m.foto,
        ocorridoEm: m.ocorridoEm,
        registradoEm: m.ocorridoEm,
        pendente: true,
      }
    })
  return [...linhas.reverse(), ...historico]
}
