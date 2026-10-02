import { api, ApiError, NetworkError } from '@/lib/api'
import { db, type ItemFila } from './db'

export type ResultadoEnvio<T> = { status: 'enviado'; dados: T } | { status: 'na-fila' }

export interface RequisicaoEscrita {
  metodo: ItemFila['metodo']
  caminho: string
  corpo?: unknown
  descricao: string
}

/**
 * Envia uma escrita ao servidor ou, sem conexão, guarda na fila local.
 * Se já houver itens pendentes, a nova escrita entra no fim da fila para
 * preservar a ordem dos lançamentos (ex.: entrada antes da saída).
 * Erros de validação do servidor (4xx) são repassados ao formulário.
 */
export async function enviar<T>(req: RequisicaoEscrita): Promise<ResultadoEnvio<T>> {
  const pendentes = await db.fila.where('status').equals('pendente').count()
  if (navigator.onLine && pendentes === 0) {
    try {
      const dados = await api<T>(req.caminho, { method: req.metodo, body: req.corpo })
      return { status: 'enviado', dados }
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e
    }
  }
  await db.fila.add({ ...req, criadoEm: Date.now(), status: 'pendente', tentativas: 0 })
  if (navigator.onLine) void processarFila()
  return { status: 'na-fila' }
}

export interface ResultadoSincronizacao {
  enviados: number
  falhas: number
  /** true quando parou por falta de rede ou de autenticação; o restante segue na fila. */
  interrompido: boolean
}

let emAndamento: Promise<ResultadoSincronizacao> | null = null

/** Envia a fila em ordem. Execuções simultâneas compartilham a mesma promessa. */
export function processarFila(): Promise<ResultadoSincronizacao> {
  emAndamento ??= executar().finally(() => {
    emAndamento = null
  })
  return emAndamento
}

async function executar(): Promise<ResultadoSincronizacao> {
  const resultado: ResultadoSincronizacao = { enviados: 0, falhas: 0, interrompido: false }
  const itens = await db.fila.where('status').equals('pendente').sortBy('id')

  for (const item of itens) {
    try {
      await api(item.caminho, { method: item.metodo, body: item.corpo })
      await db.fila.delete(item.id!)
      resultado.enviados++
    } catch (e) {
      if (e instanceof NetworkError || (e instanceof ApiError && e.status === 401)) {
        await db.fila.update(item.id!, { tentativas: item.tentativas + 1 })
        resultado.interrompido = true
        break
      }
      // Rejeitado pelo servidor (ex.: saldo insuficiente): fica para o usuário revisar ou descartar.
      await db.fila.update(item.id!, {
        status: 'falhou',
        erro: e instanceof Error ? e.message : String(e),
        tentativas: item.tentativas + 1,
      })
      resultado.falhas++
    }
  }
  return resultado
}

export async function tentarNovamente(id: number) {
  await db.fila.update(id, { status: 'pendente', erro: undefined })
  return processarFila()
}

export const descartar = (id: number) => db.fila.delete(id)
