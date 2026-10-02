import type { StatusColheita } from '@/lib/types'

/**
 * Cores do status no mapa. Os três matizes vêm da paleta categórica validada
 * (todos os pares legíveis inclusive para daltonismo); "planejada" é neutro
 * e tracejado, porque a área ainda não tem lavoura. Cada talhão também leva
 * rótulo com o status por extenso, então a cor nunca é a única pista.
 */
export const COR_STATUS: Record<StatusColheita, string> = {
  PLANEJADA: '#78716c',
  EM_DESENVOLVIMENTO: '#1baf7a',
  EM_COLHEITA: '#eb6834',
  CONCLUIDA: '#2a78d6',
}

export const COR_SEM_LAVOURA = '#a8a29e'
