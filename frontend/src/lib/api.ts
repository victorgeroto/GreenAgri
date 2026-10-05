const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'greenagri.token'
const FAZENDA_KEY = 'greenagri.fazenda'

/** Erro HTTP com a mensagem do ProblemDetail (RFC 7807) devolvido pelo backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly campos?: Record<string, string>,
  ) {
    super(message)
  }
}

/** Falha de rede: sem conexão, servidor fora do ar ou timeout. Dispara o modo offline. */
export class NetworkError extends Error {}

let onUnauthorized: (() => void) | undefined

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/** Fazenda selecionada: vai no header X-Fazenda-Id de toda requisição e separa o cache offline. */
export const fazendaStore = {
  get: (): number | undefined => {
    const v = Number(localStorage.getItem(FAZENDA_KEY))
    return Number.isFinite(v) && v > 0 ? v : undefined
  },
  set: (id: number) => localStorage.setItem(FAZENDA_KEY, String(id)),
  clear: () => localStorage.removeItem(FAZENDA_KEY),
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  timeoutMs?: number
  /** Fazenda da requisição; por padrão a selecionada (itens da fila usam a fazenda de origem). */
  fazendaId?: number
}

export async function api<T>(path: string, { method = 'GET', body, timeoutMs = 15000, fazendaId = fazendaStore.get() }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (fazendaId) headers['X-Fazenda-Id'] = String(fazendaId)
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new NetworkError('Sem conexão com o servidor')
  }

  // Proxies e gateways respondem 502-504 quando o backend está inacessível.
  if (res.status >= 502 && res.status <= 504) throw new NetworkError('Servidor indisponível')

  if (!res.ok) {
    const problem = await res.json().catch(() => ({}))
    if (res.status === 401 && !path.startsWith('/auth')) onUnauthorized?.()
    throw new ApiError(res.status, problem.detail ?? `Erro ${res.status}`, problem.campos)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
