import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFazenda } from '@/fazenda/FazendaContext'
import { fmtQtd } from '@/lib/format'
import type { AlertaIot, Produto, Veiculo } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { useSync } from '@/offline/SyncContext'

export type Gravidade = 'critico' | 'aviso' | 'info'

export interface Notificacao {
  /** Estável entre atualizações: é a chave de "lida" e de "já avisada no aparelho". */
  id: string
  gravidade: Gravidade
  titulo: string
  texto: string
  quando?: string
  link: string
}

const ler = (chave: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? '[]')
  } catch {
    return []
  }
}
const gravar = (chave: string, ids: string[]) => localStorage.setItem(chave, JSON.stringify(ids.slice(-300)))

const GRAVIDADE_IOT: Record<string, Gravidade> = { CRITICO: 'critico', AVISO: 'aviso', INFO: 'info' }

/** Junta os avisos da fazenda atual: sensores, estoque mínimo, revisões e fila recusada. */
export function useNotificacoes() {
  const { atual } = useFazenda()
  const { fila } = useSync()
  const intervalo = { refetchInterval: 60_000 }
  const { data: alertas = [] } = useDados<AlertaIot[]>('/iot/alertas', intervalo)
  const { data: baixos = [] } = useDados<Produto[]>('/estoque/alertas', intervalo)
  const { data: veiculos = [] } = useDados<Veiculo[]>('/veiculos', intervalo)

  const chaveLidas = `greenagri.notificacoes.lidas.${atual?.id}`
  const [lidas, setLidas] = useState<string[]>(() => ler(chaveLidas))
  useEffect(() => setLidas(ler(chaveLidas)), [chaveLidas])

  const todas = useMemo<Notificacao[]>(() => {
    const lista: Notificacao[] = [
      ...alertas.map((a) => ({
        id: `iot:${a.id}`,
        gravidade: GRAVIDADE_IOT[a.severidade] ?? 'info',
        titulo: a.dispositivoNome,
        texto: a.mensagem,
        quando: a.criadoEm,
        link: '/campo',
      })),
      // O saldo entra no id: repor e voltar a baixar gera um aviso novo.
      ...baixos.map((p) => ({
        id: `estoque:${p.id}:${p.quantidadeAtual}`,
        gravidade: 'aviso' as const,
        titulo: `Repor ${p.nome}`,
        texto: `Saldo ${fmtQtd(p.quantidadeAtual, p.unidade)}, abaixo do mínimo de ${fmtQtd(p.estoqueMinimo, p.unidade)}.`,
        quando: p.atualizadoEm,
        link: `/estoque/${p.id}`,
      })),
      ...veiculos
        .filter((v) => v.manutencaoPendente)
        .map((v) => ({
          id: `revisao:${v.id}:${v.proximaManutencao}`,
          gravidade: 'info' as const,
          titulo: `Revisão de ${v.identificacao}`,
          texto: `${v.modelo}: revisão prevista para ${v.proximaManutencao?.split('-').reverse().join('/')}.`,
          link: '/frota',
        })),
      ...fila
        .filter((i) => i.status === 'falhou')
        .map((i) => ({
          id: `fila:${i.id}`,
          gravidade: 'critico' as const,
          titulo: 'Lançamento recusado',
          texto: `${i.descricao}: ${i.erro ?? 'recusado pelo servidor'}`,
          quando: new Date(i.criadoEm).toISOString(),
          link: '/sincronizacao',
        })),
    ]
    const peso = { critico: 0, aviso: 1, info: 2 }
    return lista.sort((a, b) => peso[a.gravidade] - peso[b.gravidade] || (b.quando ?? '').localeCompare(a.quando ?? ''))
  }, [alertas, baixos, veiculos, fila])

  const naoLidas = todas.filter((n) => !lidas.includes(n.id))

  const marcar = useCallback(
    (ids: string[]) => {
      const novas = [...new Set([...ler(chaveLidas), ...ids])]
      gravar(chaveLidas, novas)
      setLidas(novas)
    },
    [chaveLidas],
  )

  useAvisoNoAparelho(naoLidas, atual?.id, atual?.nome)

  return { todas, naoLidas, lidas, marcarLida: (id: string) => marcar([id]), marcarTodas: () => marcar(todas.map((n) => n.id)) }
}

export const suportaNotificacoes = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Notificação do sistema (Android, Windows, macOS) para avisos críticos e de alerta
 * que ainda não foram avisados. Usa o service worker quando houver, para funcionar
 * com o app instalado e em segundo plano; cada aviso só é mostrado uma vez.
 */
function useAvisoNoAparelho(naoLidas: Notificacao[], fazendaId?: number, fazendaNome?: string) {
  useEffect(() => {
    if (!fazendaId || !suportaNotificacoes() || Notification.permission !== 'granted') return
    const chave = `greenagri.notificacoes.avisadas.${fazendaId}`
    const avisadas = ler(chave)
    const novas = naoLidas.filter((n) => n.gravidade !== 'info' && !avisadas.includes(n.id))
    if (novas.length === 0) return
    gravar(chave, [...avisadas, ...novas.map((n) => n.id)])
    for (const n of novas.slice(0, 3)) {
      const opcoes: NotificationOptions = { body: n.texto, tag: n.id, icon: '/pwa-192x192.png', badge: '/pwa-64x64.png', data: { url: n.link } }
      const titulo = `${n.titulo} · ${fazendaNome ?? 'GreenAgri'}`
      void (navigator.serviceWorker?.getRegistration?.() ?? Promise.resolve(undefined))
        .then((reg) => {
          if (reg) return reg.showNotification(titulo, opcoes)
          new Notification(titulo, opcoes)
        })
        .catch(() => {})
    }
  }, [naoLidas, fazendaId, fazendaNome])
}
