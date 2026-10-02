import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ItemFila } from './db'
import { processarFila, type ResultadoSincronizacao } from './sync'

interface SyncState {
  online: boolean
  fila: ItemFila[]
  pendentes: number
  falhas: number
  sincronizando: boolean
  ultimaSincronizacao?: number
  sincronizar: () => Promise<ResultadoSincronizacao>
}

const SyncContext = createContext<SyncState | null>(null)

const INTERVALO_REENVIO_MS = 30_000

export function SyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [online, setOnline] = useState(navigator.onLine)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSincronizacao, setUltima] = useState<number>()
  const fila = useLiveQuery(() => db.fila.orderBy('id').toArray(), [], [])

  const pendentes = fila.filter((i) => i.status === 'pendente').length
  const falhas = fila.length - pendentes

  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    try {
      const r = await processarFila()
      if (r.enviados > 0 || r.falhas > 0) await queryClient.invalidateQueries()
      if (!r.interrompido) setUltima(Date.now())
      return r
    } finally {
      setSincronizando(false)
    }
  }, [queryClient])

  useEffect(() => {
    const ficouOnline = () => {
      setOnline(true)
      void sincronizar()
      void queryClient.invalidateQueries()
    }
    const ficouOffline = () => setOnline(false)
    window.addEventListener('online', ficouOnline)
    window.addEventListener('offline', ficouOffline)
    return () => {
      window.removeEventListener('online', ficouOnline)
      window.removeEventListener('offline', ficouOffline)
    }
  }, [sincronizar, queryClient])

  // O evento "online" nem sempre dispara (ex.: Wi-Fi sem internet); tenta de tempos em tempos.
  const temPendentes = pendentes > 0
  useEffect(() => {
    if (!online || !temPendentes) return
    void sincronizar()
    const timer = setInterval(() => void sincronizar(), INTERVALO_REENVIO_MS)
    return () => clearInterval(timer)
  }, [online, temPendentes, sincronizar])

  const value = useMemo(
    () => ({ online, fila, pendentes, falhas, sincronizando, ultimaSincronizacao, sincronizar }),
    [online, fila, pendentes, falhas, sincronizando, ultimaSincronizacao, sincronizar],
  )
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync deve ser usado dentro de <SyncProvider>')
  return ctx
}
