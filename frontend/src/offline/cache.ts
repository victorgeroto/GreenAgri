import { NetworkError } from '@/lib/api'
import { db } from './db'

/**
 * Busca no servidor e grava a resposta no IndexedDB; sem rede, devolve a
 * última cópia salva. Assim todas as telas abrem offline com o último dado visto.
 */
export async function comCache<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
  try {
    const dados = await buscar()
    await db.cache.put({ chave, dados, salvoEm: Date.now() })
    return dados
  } catch (e) {
    if (e instanceof NetworkError) {
      const salvo = await db.cache.get(chave)
      if (salvo) return salvo.dados as T
    }
    throw e
  }
}

export async function salvoEm(chave: string) {
  return (await db.cache.get(chave))?.salvoEm
}

export const limparCache = () => Promise.all([db.cache.clear(), db.fila.clear()])
