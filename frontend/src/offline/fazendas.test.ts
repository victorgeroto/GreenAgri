import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fazendaStore } from '@/lib/api'
import { comCache } from './cache'
import { db } from './db'
import { enviar, processarFila } from './sync'

let online = true
let armazenado: Record<string, string>

beforeEach(async () => {
  online = true
  armazenado = { 'greenagri.token': 'token' }
  vi.stubGlobal('navigator', {
    get onLine() {
      return online
    },
  })
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => armazenado[k] ?? null,
    setItem: (k: string, v: string) => (armazenado[k] = v),
    removeItem: (k: string) => delete armazenado[k],
  })
  await Promise.all([db.fila.clear(), db.cache.clear()])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const ok = () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
const headerFazenda = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)['X-Fazenda-Id']

describe('várias fazendas', () => {
  it('envia a fazenda selecionada no header de cada requisição', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    fazendaStore.set(2)

    await enviar({ metodo: 'POST', caminho: '/estoque/movimentacoes', corpo: {}, descricao: 'x' })

    expect(headerFazenda(fetchMock.mock.calls[0])).toBe('2')
  })

  it('lançamento feito offline vai para a fazenda de origem mesmo após trocar de fazenda', async () => {
    fazendaStore.set(1)
    online = false
    await enviar({ metodo: 'POST', caminho: '/estoque/movimentacoes', corpo: { produtoId: 7 }, descricao: 'saída na fazenda 1' })
    expect((await db.fila.toArray())[0].fazendaId).toBe(1)

    // O usuário troca para a fazenda 2 antes de o sinal voltar.
    fazendaStore.set(2)
    online = true
    const fetchMock = vi.fn().mockResolvedValue(ok())
    vi.stubGlobal('fetch', fetchMock)
    const r = await processarFila()

    expect(r.enviados).toBe(1)
    expect(headerFazenda(fetchMock.mock.calls[0])).toBe('1')
  })

  it('o cache offline de cada fazenda é separado', async () => {
    await comCache('1:/produtos', async () => ['soja da fazenda 1'])
    await comCache('2:/produtos', async () => ['feijão da fazenda 2'])
    const semRede = async (): Promise<string[]> => {
      throw new (await import('@/lib/api')).NetworkError('offline')
    }

    expect(await comCache('1:/produtos', semRede)).toEqual(['soja da fazenda 1'])
    expect(await comCache('2:/produtos', semRede)).toEqual(['feijão da fazenda 2'])
  })
})
