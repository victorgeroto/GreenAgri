import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, setUnauthorizedHandler, fazendaStore, tokenStore } from '@/lib/api'
import type { TokenResponse, Usuario } from '@/lib/types'
import { limparCache } from '@/offline/cache'

const USUARIO_KEY = 'greenagri.usuario'

interface AuthState {
  usuario: Usuario | null
  /** Sessão expirou no servidor; o app pede login de novo sem perder a fila offline. */
  sessaoExpirada: boolean
  entrar: (email: string, senha: string) => Promise<void>
  registrar: (nome: string, email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

function lerUsuario(): Usuario | null {
  try {
    const salvo = localStorage.getItem(USUARIO_KEY)
    return salvo && tokenStore.get() ? (JSON.parse(salvo) as Usuario) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<Usuario | null>(lerUsuario)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)

  const iniciarSessao = useCallback((r: TokenResponse) => {
    tokenStore.set(r.token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(r.usuario))
    setUsuario(r.usuario)
    setSessaoExpirada(false)
  }, [])

  useEffect(() => {
    // 401 com sessão ativa: token expirou. Mantém cache e fila para não perder lançamentos offline.
    setUnauthorizedHandler(() => setSessaoExpirada(true))
  }, [])

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const anterior = usuario?.email
      const r = await api<TokenResponse>('/auth/login', { method: 'POST', body: { email, senha } })
      if (anterior && anterior !== r.usuario.email) {
        await limparCache()
        fazendaStore.clear()
      }
      iniciarSessao(r)
      await queryClient.invalidateQueries()
    },
    [usuario, iniciarSessao, queryClient],
  )

  const registrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      iniciarSessao(await api<TokenResponse>('/auth/registro', { method: 'POST', body: { nome, email, senha } }))
    },
    [iniciarSessao],
  )

  const sair = useCallback(async () => {
    tokenStore.clear()
    fazendaStore.clear()
    localStorage.removeItem(USUARIO_KEY)
    await limparCache()
    queryClient.clear()
    setUsuario(null)
    setSessaoExpirada(false)
  }, [queryClient])

  const value = useMemo(
    () => ({ usuario, sessaoExpirada, entrar, registrar, sair }),
    [usuario, sessaoExpirada, entrar, registrar, sair],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
