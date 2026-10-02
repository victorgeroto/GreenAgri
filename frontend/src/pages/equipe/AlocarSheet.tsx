import { UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Sheet, Textarea } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { ATIVIDADES, FUNCOES, TIPOS_VEICULO } from '@/lib/format'
import type { Alocacao, Operador, Talhao, TipoAtividade, TipoVeiculo, Veiculo } from '@/lib/types'
import { useAlocar } from './hooks'

export function habilitado(o: Operador, tipo: TipoVeiculo) {
  return o.habilitacoes.includes(tipo) || (tipo === 'IMPLEMENTO' && o.habilitacoes.includes('TRATOR'))
}

const SUGESTAO: Partial<Record<TipoVeiculo, TipoAtividade>> = {
  COLHEITADEIRA: 'COLHEITA',
  PULVERIZADOR: 'PULVERIZACAO',
  CAMINHAO: 'TRANSPORTE',
  TRATOR: 'PLANTIO',
}

/** Por que a máquina não pode receber este operador nesta atividade (ou undefined se pode). */
function bloqueioMaquina(v: Veiculo, atividade: TipoAtividade, operador: Operador | undefined, ocupacao: Map<number, Alocacao>) {
  const manutencao = atividade === 'MANUTENCAO'
  if (v.status === 'INATIVO') return 'inativa'
  if (v.status === 'MANUTENCAO' && !manutencao) return 'em manutenção'
  const ocupada = ocupacao.get(v.id)
  if (ocupada && ocupada.operadorId !== operador?.id) return `com ${ocupada.operadorNome.split(' ')[0]}`
  if (operador && !manutencao && !habilitado(operador, v.tipo)) return 'sem habilitação'
  return undefined
}

interface Props {
  aberto: boolean
  onFechar: () => void
  operadores: Operador[]
  veiculos: Veiculo[]
  talhoes: Talhao[]
  ocupacao: Map<number, Alocacao>
  operadorInicial?: Operador
  veiculoInicial?: Veiculo
}

export function AlocarSheet({ aberto, onFechar, operadores, veiculos, talhoes, ocupacao, operadorInicial, veiculoInicial }: Props) {
  const toast = useToast()
  const alocar = useAlocar()
  const [operadorId, setOperadorId] = useState<number>()
  const [atividade, setAtividade] = useState<TipoAtividade>('OUTRA')
  const [veiculoId, setVeiculoId] = useState<number>()
  const [talhaoId, setTalhaoId] = useState<number>()
  const [descricao, setDescricao] = useState('')
  const [previsao, setPrevisao] = useState('')
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (!aberto) return
    setErro(undefined)
    setDescricao('')
    setPrevisao('')
    setTalhaoId(undefined)
    setOperadorId(operadorInicial?.id)
    setVeiculoId(veiculoInicial?.id)
    setAtividade(veiculoInicial ? (veiculoInicial.status === 'MANUTENCAO' ? 'MANUTENCAO' : SUGESTAO[veiculoInicial.tipo] ?? 'OUTRA') : 'OUTRA')
  }, [aberto, operadorInicial, veiculoInicial])

  const operador = operadores.find((o) => o.id === operadorId)
  const veiculo = veiculos.find((v) => v.id === veiculoId)
  const disponiveis = useMemo(() => operadores.filter((o) => o.situacao === 'DISPONIVEL' || o.id === operadorInicial?.id), [operadores, operadorInicial])

  function escolherMaquina(id?: number) {
    setVeiculoId(id)
    const v = veiculos.find((x) => x.id === id)
    if (v) setAtividade(v.status === 'MANUTENCAO' ? 'MANUTENCAO' : SUGESTAO[v.tipo] ?? atividade)
  }

  const bloqueio = veiculo ? bloqueioMaquina(veiculo, atividade, operador, ocupacao) : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(undefined)
    if (!operador) return setErro('Escolha o operador')
    if (!veiculoId && !talhaoId) return setErro('Informe a máquina ou o talhão da atividade')
    if (bloqueio) return setErro(`${veiculo!.identificacao}: ${bloqueio}`)
    const talhao = talhoes.find((t) => t.id === talhaoId)
    try {
      const r = await alocar.mutateAsync({
        operadorId: operador.id,
        operadorNome: operador.nome,
        alvo: [veiculo?.identificacao, talhao && `talhão ${talhao.codigo}`].filter(Boolean).join(' · '),
        atividade,
        veiculoId,
        talhaoId,
        descricao: descricao.trim() || undefined,
        previsaoFim: previsao ? new Date(previsao).toISOString() : undefined,
        idCliente: crypto.randomUUID(),
      })
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? `${operador.nome.split(' ')[0]} alocado(a) em ${ATIVIDADES[atividade].toLowerCase()}` : 'Sem conexão: alocação salva e será sincronizada')
      onFechar()
    } catch (err) {
      setErro(err instanceof ApiError && err.campos ? Object.values(err.campos).join(' · ') : err instanceof Error ? err.message : 'Erro ao alocar')
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={veiculoInicial ? `Alocar operador em ${veiculoInicial.identificacao}` : 'Alocar em atividade'}>
      <form onSubmit={enviar} className="space-y-4">
        <Field label="Operador" dica={operador ? `${FUNCOES[operador.funcao]} · habilitações: ${operador.habilitacoes.map((h) => TIPOS_VEICULO[h].toLowerCase()).join(', ') || 'nenhuma'}` : `${disponiveis.length} disponíveis agora`}>
          {(id) => (
            <Select id={id} value={operadorId ?? ''} onChange={(e) => setOperadorId(Number(e.target.value) || undefined)} required disabled={!!operadorInicial}>
              <option value="">Selecione…</option>
              {disponiveis.map((o) => {
                const semHabilitacao = veiculo && atividade !== 'MANUTENCAO' && !habilitado(o, veiculo.tipo)
                return (
                  <option key={o.id} value={o.id} disabled={semHabilitacao}>
                    {o.nome} · {FUNCOES[o.funcao]}
                    {semHabilitacao ? ' (sem habilitação)' : ''}
                  </option>
                )
              })}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Atividade">
            {(id) => (
              <Select id={id} value={atividade} onChange={(e) => setAtividade(e.target.value as TipoAtividade)}>
                {Object.entries(ATIVIDADES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Máquina" erro={bloqueio && `${veiculo!.identificacao} ${bloqueio}`}>
            {(id) => (
              <Select id={id} value={veiculoId ?? ''} onChange={(e) => escolherMaquina(Number(e.target.value) || undefined)} disabled={!!veiculoInicial}>
                <option value="">Sem máquina</option>
                {veiculos.map((v) => {
                  const motivo = bloqueioMaquina(v, atividade, operador, ocupacao)
                  return (
                    <option key={v.id} value={v.id} disabled={!!motivo && v.id !== veiculoInicial?.id}>
                      {v.identificacao} · {v.modelo}
                      {motivo ? ` (${motivo})` : ''}
                    </option>
                  )
                })}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Talhão">
            {(id) => (
              <Select id={id} value={talhaoId ?? ''} onChange={(e) => setTalhaoId(Number(e.target.value) || undefined)}>
                <option value="">Nenhum</option>
                {talhoes.map((t) => (
                  <option key={t.id} value={t.id}>{t.codigo} · {t.nome}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Término previsto">
            {(id) => <Input id={id} type="datetime-local" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />}
          </Field>
        </div>

        <Field label="Descrição (opcional)">
          {(id) => <Textarea id={id} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} placeholder="Ex.: colheita do trigo, começar pela cabeceira norte" />}
        </Field>

        {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" icon={UserPlus} className="w-full" carregando={alocar.isPending}>
          Alocar
        </Button>
      </form>
    </Sheet>
  )
}
