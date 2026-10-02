import type {
  Categoria,
  StatusColheita,
  StatusVeiculo,
  TipoDispositivo,
  TipoMovimentacao,
  TipoVeiculo,
  Unidade,
} from './types'

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const relativo = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const fmtNumero = (n: number | null | undefined) => (n == null ? '—' : numero.format(n))

/** Datas ISO sem horário (yyyy-mm-dd) são interpretadas no fuso local, não em UTC. */
function paraData(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor)
}

export const fmtData = (iso?: string) => (iso ? dataCurta.format(paraData(iso)) : '—')
export const fmtDataHora = (iso?: string) => (iso ? dataHora.format(paraData(iso)) : '—')

export function fmtRelativo(iso?: string) {
  if (!iso) return 'nunca'
  const segundos = (paraData(iso).getTime() - Date.now()) / 1000
  const abs = Math.abs(segundos)
  if (abs < 60) return 'agora'
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), 'minute')
  if (abs < 86400) return relativo.format(Math.round(segundos / 3600), 'hour')
  return relativo.format(Math.round(segundos / 86400), 'day')
}

export function diasAte(iso: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((paraData(iso).getTime() - hoje.getTime()) / 86_400_000)
}

export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const CATEGORIAS: Record<Categoria, string> = {
  GRAOS: 'Grãos',
  SEMENTES: 'Sementes',
  FERTILIZANTES: 'Fertilizantes',
  DEFENSIVOS: 'Defensivos',
  RACAO: 'Ração',
  COMBUSTIVEL: 'Combustível',
  PECAS: 'Peças',
  OUTROS: 'Outros',
}

export const UNIDADES: Record<Unidade, string> = {
  KG: 'kg',
  SACA: 'sc',
  TONELADA: 't',
  LITRO: 'L',
  UNIDADE: 'un',
}

export const TIPOS_MOVIMENTACAO: Record<TipoMovimentacao, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Inventário',
}

export const STATUS_COLHEITA: Record<StatusColheita, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
}

export const TIPOS_VEICULO: Record<TipoVeiculo, string> = {
  TRATOR: 'Trator',
  COLHEITADEIRA: 'Colheitadeira',
  PULVERIZADOR: 'Pulverizador',
  CAMINHAO: 'Caminhão',
  UTILITARIO: 'Utilitário',
  IMPLEMENTO: 'Implemento',
}

export const STATUS_VEICULO: Record<StatusVeiculo, string> = {
  DISPONIVEL: 'Disponível',
  EM_OPERACAO: 'Em operação',
  MANUTENCAO: 'Em manutenção',
  INATIVO: 'Inativo',
}

export const TIPOS_DISPOSITIVO: Record<TipoDispositivo, string> = {
  ESTACAO_METEOROLOGICA: 'Estação meteorológica',
  SENSOR_SOLO: 'Sensor de solo',
  SENSOR_SILO: 'Sensor de silo',
}

export const fmtQtd = (n: number, unidade: Unidade) => `${fmtNumero(n)} ${UNIDADES[unidade]}`
