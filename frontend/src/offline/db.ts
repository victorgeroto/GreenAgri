import Dexie, { type Table } from 'dexie'

/** Última resposta conhecida de cada consulta GET, usada quando não há rede. */
export interface CacheEntry {
  chave: string
  dados: unknown
  salvoEm: number
}

export type StatusFila = 'pendente' | 'falhou'

/** Requisição de escrita aguardando envio ao servidor. */
export interface ItemFila {
  id?: number
  metodo: 'POST' | 'PUT' | 'DELETE'
  caminho: string
  corpo?: unknown
  /** Texto exibido ao usuário na tela de sincronização. */
  descricao: string
  criadoEm: number
  status: StatusFila
  erro?: string
  tentativas: number
}

class GreenAgriDB extends Dexie {
  cache!: Table<CacheEntry, string>
  fila!: Table<ItemFila, number>

  constructor() {
    super('greenagri')
    this.version(1).stores({
      cache: 'chave',
      fila: '++id, status, criadoEm',
    })
  }
}

export const db = new GreenAgriDB()
