export type Perfil = 'ADMIN' | 'OPERADOR'

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export interface TokenResponse {
  token: string
  expiraEmSegundos: number
  usuario: Usuario
}

export type Categoria =
  | 'GRAOS'
  | 'SEMENTES'
  | 'FERTILIZANTES'
  | 'DEFENSIVOS'
  | 'RACAO'
  | 'COMBUSTIVEL'
  | 'PECAS'
  | 'OUTROS'

export type Unidade = 'KG' | 'SACA' | 'TONELADA' | 'LITRO' | 'UNIDADE'

export interface Produto {
  id: number
  sku: string
  nome: string
  categoria: Categoria
  unidade: Unidade
  quantidadeAtual: number
  estoqueMinimo: number
  abaixoDoMinimo: boolean
  localizacao?: string
  descricao?: string
  /** Caminho público (/img/...) ou data URL JPEG. */
  imagem?: string
  atualizadoEm: string
}

export interface ProdutoInput {
  sku: string
  nome: string
  categoria: Categoria
  unidade: Unidade
  estoqueMinimo: number
  quantidadeInicial?: number
  localizacao?: string
  descricao?: string
  imagem?: string
}

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE'

export interface Movimentacao {
  id: number
  produtoId: number
  produtoNome: string
  unidade: Unidade
  tipo: TipoMovimentacao
  quantidade: number
  saldoApos: number
  motivo?: string
  responsavel?: string
  idCliente?: string
  ocorridoEm: string
  registradoEm: string
  /** Somente no cliente: lançamento ainda na fila offline. */
  pendente?: boolean
}

export interface MovimentacaoInput {
  produtoId: number
  tipo: TipoMovimentacao
  quantidade: number
  motivo?: string
  idCliente: string
  ocorridoEm: string
}

export type StatusColheita = 'PLANEJADA' | 'EM_DESENVOLVIMENTO' | 'EM_COLHEITA' | 'CONCLUIDA'

export interface Colheita {
  id: number
  talhaoId: number
  /** Código do talhão (ex.: T-04). */
  talhao: string
  /** Ano-safra, ex.: 2025/26. */
  safra: string
  cultura: string
  areaHa: number
  dataPlantio: string
  previsaoColheita: string
  dataColheita?: string
  producaoEstimadaKg?: number
  producaoRealKg?: number
  status: StatusColheita
  statusDesde: string
  produtoId?: number
  produtoNome?: string
  observacoes?: string
  produtividadeSacasHa?: number
  /** Somente no cliente: mudança de status ainda na fila offline. */
  statusPendente?: boolean
}

export interface ColheitaInput {
  talhaoId: number
  cultura: string
  safra?: string
  areaHa?: number
  dataPlantio: string
  previsaoColheita: string
  producaoEstimadaKg?: number
  status?: StatusColheita
  produtoId?: number
  observacoes?: string
}

export type TipoVeiculo = 'TRATOR' | 'COLHEITADEIRA' | 'PULVERIZADOR' | 'CAMINHAO' | 'UTILITARIO' | 'IMPLEMENTO'
export type StatusVeiculo = 'DISPONIVEL' | 'EM_OPERACAO' | 'MANUTENCAO' | 'INATIVO'

export interface Veiculo {
  id: number
  identificacao: string
  modelo: string
  tipo: TipoVeiculo
  ano: number
  horimetro: number
  status: StatusVeiculo
  proximaManutencao?: string
  manutencaoPendente: boolean
  observacoes?: string
}

export type VeiculoInput = Omit<Veiculo, 'id' | 'manutencaoPendente'>

export type TipoDispositivo = 'ESTACAO_METEOROLOGICA' | 'SENSOR_SOLO' | 'SENSOR_SILO' | 'RASTREADOR_MAQUINA'

export interface Leitura {
  medidoEm: string
  temperatura?: number
  umidadeAr?: number
  umidadeSolo?: number
  nivelPercentual?: number
  bateria?: number
  rssi?: number
  latitude?: number
  longitude?: number
  /** km/h */
  velocidade?: number
  operando?: boolean
}

export interface ReconciliacaoSilo {
  produtoId: number
  produtoNome: string
  capacidadeKg: number
  medidoKg: number
  registradoKg: number
  divergenciaPercentual?: number
  divergente: boolean
}

export interface Dispositivo {
  id: number
  codigo: string
  nome: string
  tipo: TipoDispositivo
  localizacao?: string
  latitude?: number
  longitude?: number
  firmwareVersao?: string
  ultimoContato?: string
  online: boolean
  bateria?: number
  ultimaLeitura?: Leitura
  silo?: ReconciliacaoSilo
  veiculoId?: number
  veiculoIdentificacao?: string
}

export type SeveridadeAlerta = 'INFO' | 'AVISO' | 'CRITICO'

export interface AlertaIot {
  id: number
  dispositivoId: number
  dispositivoNome: string
  tipo: string
  severidade: SeveridadeAlerta
  mensagem: string
  valor?: number
  criadoEm: string
  reconhecido: boolean
}

export interface ResumoDashboard {
  produtos: number
  estoqueBaixo: Produto[]
  movimentacoes30d: number
  ultimasMovimentacoes: Movimentacao[]
  colheitasAbertas: number
  proximasColheitas: Colheita[]
  veiculosEmManutencao: number
  manutencoesPendentes: number
  dispositivosOnline: number
  dispositivos: number
  alertasIotAbertos: number
  silos: Dispositivo[]
}

/** Polígono GeoJSON; coordenadas em [longitude, latitude]. */
export interface Poligono {
  type: 'Polygon'
  coordinates: [number, number][][]
}

export interface Talhao {
  id: number
  codigo: string
  nome: string
  geometria?: Poligono
  areaHa?: number
  latitude?: number
  longitude?: number
}

export interface TalhaoInput {
  codigo: string
  nome: string
  geometria?: Poligono
}

export interface EventoColheita {
  id: number
  statusAnterior?: StatusColheita
  statusNovo: StatusColheita
  origem: 'MANUAL' | 'DISPOSITIVO'
  responsavel?: string
  observacao?: string
  latitude?: number
  longitude?: number
  ocorridoEm: string
}
