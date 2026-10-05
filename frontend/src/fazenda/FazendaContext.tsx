import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { api, fazendaStore } from '@/lib/api'
import type { Fazenda, FazendaInput } from '@/lib/types'
import { comCache } from '@/offline/cache'

interface FazendaState {
  fazendas: Fazenda[]
  /** Fazenda selecionada; undefined enquanto carrega ou se o usuário ainda não tem nenhuma. */
  atual?: Fazenda
  carregando: boolean
  selecionar: (id: number) => void
  criar: (dados: FazendaInput) => Promise<Fazenda>
  atualizar: (id: number, dados: FazendaInput) => Promise<Fazenda>
}

const FazendaContext = createContext<FazendaState | null>(null)

export function FazendaProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [selecionada, setSelecionada] = useState(fazendaStore.get)

  // Lista das fazendas do usuário; também fica no cache offline para abrir o app sem sinal.
  const lista = useQuery({
    queryKey: ['fazendas', usuario?.email],
    queryFn: () => comCache(`fazendas:${usuario!.email}`, () => api<Fazenda[]>('/fazendas')),
    enabled: !!usuario,
  })
  const fazendas = useMemo(() => lista.data ?? [], [lista.data])

  const principal = fazendas.reduce<Fazenda | undefined>((menor, f) => (!menor || f.id < menor.id ? f : menor), undefined)
  const atual = fazendas.find((f) => f.id === selecionada) ?? principal

  // Mantém o header das requisições alinhado à fazenda exibida (ex.: a salva foi removida).
  useEffect(() => {
    if (atual && atual.id !== fazendaStore.get()) fazendaStore.set(atual.id)
  }, [atual])

  useEffect(() => {
    if (!usuario) setSelecionada(undefined)
  }, [usuario])

  const selecionar = useCallback((id: number) => {
    fazendaStore.set(id)
    setSelecionada(id)
  }, [])

  const criar = useCallback(
    async (dados: FazendaInput) => {
      const nova = await api<Fazenda>('/fazendas', { method: 'POST', body: dados })
      await queryClient.invalidateQueries({ queryKey: ['fazendas'] })
      selecionar(nova.id)
      return nova
    },
    [queryClient, selecionar],
  )

  const atualizar = useCallback(
    async (id: number, dados: FazendaInput) => {
      const f = await api<Fazenda>(`/fazendas/${id}`, { method: 'PUT', body: dados })
      await queryClient.invalidateQueries({ queryKey: ['fazendas'] })
      return f
    },
    [queryClient],
  )

  const value = useMemo(
    () => ({ fazendas, atual, carregando: lista.isLoading, selecionar, criar, atualizar }),
    [fazendas, atual, lista.isLoading, selecionar, criar, atualizar],
  )
  return <FazendaContext.Provider value={value}>{children}</FazendaContext.Provider>
}

export function useFazenda() {
  const ctx = useContext(FazendaContext)
  if (!ctx) throw new Error('useFazenda deve ser usado dentro de <FazendaProvider>')
  return ctx
}

/** Centro inicial do mapa: a sede da fazenda ou, sem coordenadas, o centro do Brasil. */
export function centroDaFazenda(f?: Fazenda): { centro: [number, number]; zoom: number } {
  return f?.latitude != null && f.longitude != null ? { centro: [f.latitude, f.longitude], zoom: 14 } : { centro: [-15.8, -47.9], zoom: 4 }
}

export const localDaFazenda = (f?: Fazenda) => (f ? `${f.municipio} · ${f.uf}` : '')
