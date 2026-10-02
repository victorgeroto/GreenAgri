import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MovimentacaoInput, Produto } from '@/lib/types'
import { comCache } from './cache'
import { db } from './db'
import { aplicarPendentes, historicoComPendentes } from './pendentes'
import { enviar, processarFila } from './sync'

const produto = (id: number, quantidadeAtual: number, estoqueMinimo = 10): Produto => ({
  id,
  sku: `P-${id}`,
  nome: `Produto ${id}`,
  categoria: 'GRAOS',
  unidade: 'SACA',
  quantidadeAtual,
  estoqueMinimo,
  abaixoDoMinimo: quantidadeAtual < estoqueMinimo,
  atualizadoEm: '2026-01-01T00:00:00Z',
})

const mov = (produtoId: number, tipo: MovimentacaoInput['tipo'], quantidade: number): MovimentacaoInput => ({
  produtoId,
  tipo,
  quantidade,
  idCliente: crypto.randomUUID(),
  ocorridoEm: new Date().toISOString(),
})

const resposta = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let online = true

beforeEach(async () => {
  online = true
  vi.stubGlobal('navigator', {
    get onLine() {
      return online
    },
  })
  vi.stubGlobal('localStorage', { getItem: () => 'token', setItem: () => {}, removeItem: () => {} })
  await Promise.all([db.fila.clear(), db.cache.clear()])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('aplicarPendentes', () => {
  it('projeta o saldo com entradas, saídas e inventário na ordem', () => {
    const [p] = aplicarPendentes([produto(1, 100)], [mov(1, 'SAIDA', 30), mov(1, 'ENTRADA', 5), mov(1, 'AJUSTE', 8)])
    expect(p.quantidadeAtual).toBe(8)
    expect(p.abaixoDoMinimo).toBe(true)
  })

  it('não altera produtos sem lançamentos pendentes', () => {
    const lista = [produto(1, 100), produto(2, 50)]
    const resultado = aplicarPendentes(lista, [mov(1, 'SAIDA', 10)])
    expect(resultado[1]).toBe(lista[1])
  })
})

describe('historicoComPendentes', () => {
  it('mostra pendentes no topo e oculta os que o servidor já registrou', () => {
    const jaEnviado = mov(1, 'ENTRADA', 10)
    const novo = mov(1, 'SAIDA', 4)
    const historico = [
      {
        id: 7, produtoId: 1, produtoNome: 'Produto 1', unidade: 'SACA' as const, tipo: 'ENTRADA' as const,
        quantidade: 10, saldoApos: 110, idCliente: jaEnviado.idCliente, ocorridoEm: '', registradoEm: '',
      },
    ]
    const linhas = historicoComPendentes(historico, [jaEnviado, novo], [produto(1, 110)])
    expect(linhas).toHaveLength(2)
    expect(linhas[0]).toMatchObject({ pendente: true, tipo: 'SAIDA', saldoApos: 106 })
  })
})

describe('fila offline', () => {
  it('guarda na fila quando não há conexão e envia ao reconectar', async () => {
    online = false
    const fetchMock = vi.fn().mockResolvedValue(resposta(201, { id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    const r = await enviar({ metodo: 'POST', caminho: '/estoque/movimentacoes', corpo: mov(1, 'SAIDA', 5), descricao: 'x' })
    expect(r.status).toBe('na-fila')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await db.fila.count()).toBe(1)

    online = true
    const sync = await processarFila()
    expect(sync).toMatchObject({ enviados: 1, falhas: 0, interrompido: false })
    expect(await db.fila.count()).toBe(0)
  })

  it('enfileira quando a rede cai no meio do envio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const r = await enviar({ metodo: 'POST', caminho: '/produtos', corpo: {}, descricao: 'x' })
    expect(r.status).toBe('na-fila')
  })

  it('marca como falha o item rejeitado pelo servidor e continua com os demais', async () => {
    online = false
    await enviar({ metodo: 'POST', caminho: '/estoque/movimentacoes', corpo: mov(1, 'SAIDA', 999), descricao: 'a' })
    await enviar({ metodo: 'POST', caminho: '/estoque/movimentacoes', corpo: mov(1, 'ENTRADA', 1), descricao: 'b' })

    online = true
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(resposta(422, { detail: 'Saldo insuficiente' }))
        .mockResolvedValueOnce(resposta(201, {})),
    )
    const sync = await processarFila()
    expect(sync).toMatchObject({ enviados: 1, falhas: 1 })

    const [restante] = await db.fila.toArray()
    expect(restante).toMatchObject({ status: 'falhou', erro: 'Saldo insuficiente', descricao: 'a' })
  })

  it('para no primeiro erro de rede preservando a ordem', async () => {
    online = false
    await enviar({ metodo: 'POST', caminho: '/a', descricao: 'a' })
    await enviar({ metodo: 'POST', caminho: '/b', descricao: 'b' })

    online = true
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    const sync = await processarFila()

    expect(sync.interrompido).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await db.fila.where('status').equals('pendente').count()).toBe(2)
  })

  it('escrita nova entra no fim da fila se já houver pendências', async () => {
    online = false
    await enviar({ metodo: 'POST', caminho: '/primeiro', descricao: '1' })
    online = true
    const fetchMock = vi.fn().mockResolvedValue(resposta(201, {}))
    vi.stubGlobal('fetch', fetchMock)

    const r = await enviar({ metodo: 'POST', caminho: '/segundo', descricao: '2' })
    expect(r.status).toBe('na-fila')
    await processarFila()
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual(['/api/primeiro', '/api/segundo'])
  })
})

describe('comCache', () => {
  it('devolve a última cópia quando a rede falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(200, [1, 2, 3])))
    const { api } = await import('@/lib/api')
    expect(await comCache('/produtos', () => api('/produtos'))).toEqual([1, 2, 3])

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    expect(await comCache('/produtos', () => api('/produtos'))).toEqual([1, 2, 3])
  })
})
