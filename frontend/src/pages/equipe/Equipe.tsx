import { CalendarOff, CloudOff, Search, Square, Tractor, UserCheck, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Abas, Badge, Button, Card, Carregando, Erro, Indicador, Indicadores, Input, PageHeader, Segmentado, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ATIVIDADES, fmtData, fmtHora, fmtRelativo, FUNCOES, SITUACOES, TIPOS_VEICULO, TURNOS } from '@/lib/format'
import type { Alocacao, Operador, SituacaoOperador, Talhao, Veiculo } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { AlocarSheet } from './AlocarSheet'
import { Avatar, resumoAtividade } from './componentes'
import { useEncerrar, useEquipe } from './hooks'

type Filtro = 'TODOS' | SituacaoOperador
type Aba = 'operadores' | 'atividades'

const tomSituacao = { DISPONIVEL: 'verde', EM_ATIVIDADE: 'azul', AUSENTE: 'neutro' } as const

function BotaoEncerrar({ a, nome, pendente }: { a: Alocacao; nome: string; pendente?: boolean }) {
  const encerrar = useEncerrar()
  const toast = useToast()
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={Square}
      disabled={a.pendente || pendente}
      title={a.pendente ? 'Aguardando sincronizar a alocação' : undefined}
      carregando={encerrar.isPending}
      onClick={async () => {
        if (!confirm(`Encerrar ${ATIVIDADES[a.atividade].toLowerCase()} de ${nome}?`)) return
        try {
          const r = await encerrar.mutateAsync({ alocacao: a, operadorNome: nome })
          toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Atividade encerrada' : 'Sem conexão: encerramento será sincronizado')
        } catch (e) {
          toast('erro', e instanceof Error ? e.message : 'Erro ao encerrar')
        }
      }}
    >
      Encerrar
    </Button>
  )
}

function CartaoOperador({ o, onAlocar }: { o: Operador; onAlocar: () => void }) {
  const a = o.alocacaoAtual
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar nome={o.nome} situacao={o.situacao} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{o.nome}</p>
          <p className="truncate text-xs text-stone-500">
            {FUNCOES[o.funcao]} · {o.matricula}
          </p>
        </div>
        <Badge tom={tomSituacao[o.situacao]} ponto>
          {SITUACOES[o.situacao]}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 text-xs">
        <div>
          <dt className="text-stone-500">Turno</dt>
          <dd className="font-medium text-stone-800">{TURNOS[o.turno]}</dd>
        </div>
        <div>
          <dt className="text-stone-500">CNH</dt>
          <dd className="font-medium text-stone-800">{o.cnhCategoria ?? '—'}</dd>
        </div>
      </dl>

      <div>
        <p className="mb-1 text-xs text-stone-500">Habilitado para</p>
        <div className="flex flex-wrap gap-1">
          {o.habilitacoes.length ? (
            o.habilitacoes.map((h) => <Badge key={h}>{TIPOS_VEICULO[h]}</Badge>)
          ) : (
            <span className="text-xs text-stone-400">Atividades manuais</span>
          )}
        </div>
      </div>

      <div className="mt-auto">
        {o.situacao === 'EM_ATIVIDADE' && a ? (
          <div className="rounded-md border border-sky-200 bg-sky-50/60 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                  {resumoAtividade(a)}
                  {a.pendente && (
                    <Badge tom="amarelo">
                      <CloudOff className="h-3 w-3" /> Na fila
                    </Badge>
                  )}
                </p>
                {a.descricao && <p className="truncate text-xs text-stone-600">{a.descricao}</p>}
                <p className="text-xs text-stone-500">
                  Desde {fmtHora(a.inicio)} ({fmtRelativo(a.inicio)}){a.previsaoFim && ` · término previsto ${fmtHora(a.previsaoFim)}`}
                </p>
              </div>
              <BotaoEncerrar a={a} nome={o.nome} />
            </div>
          </div>
        ) : o.situacao === 'AUSENTE' ? (
          <p className="flex items-center gap-1.5 rounded-md bg-stone-50 px-2.5 py-2 text-xs text-stone-600">
            <CalendarOff className="h-3.5 w-3.5" /> {o.motivoAusencia} até {fmtData(o.ausenteAte)}
          </p>
        ) : (
          <Button variant="secondary" size="sm" icon={UserPlus} onClick={onAlocar} className="w-full">
            Alocar em atividade
          </Button>
        )}
      </div>
    </Card>
  )
}

function ListaAtividades({ operadores }: { operadores: Operador[] }) {
  const ativas = operadores.filter((o) => o.alocacaoAtual)
  if (ativas.length === 0) return <Vazio icon={Tractor} titulo="Nenhuma atividade em andamento" />
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
      {ativas.map((o) => {
        const a = o.alocacaoAtual!
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar nome={o.nome} situacao={o.situacao} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-stone-900">
                {o.nome}
                <span className="font-normal text-stone-400">→</span>
                {resumoAtividade(a)}
                {a.pendente && (
                  <Badge tom="amarelo">
                    <CloudOff className="h-3 w-3" /> Na fila
                  </Badge>
                )}
              </p>
              <p className="truncate text-xs text-stone-500">
                {a.veiculoModelo && `${a.veiculoModelo} · `}
                desde {fmtHora(a.inicio)}
                {a.previsaoFim && ` · término previsto ${fmtHora(a.previsaoFim)}`}
                {a.responsavel && ` · por ${a.responsavel}`}
              </p>
            </div>
            <BotaoEncerrar a={a} nome={o.nome} />
          </li>
        )
      })}
    </ul>
  )
}

export default function Equipe() {
  const { data: veiculos = [] } = useDados<Veiculo[]>('/veiculos')
  const { data: talhoes = [] } = useDados<Talhao[]>('/talhoes')
  const { operadores, alocacaoPorVeiculo, isLoading, error, refetch } = useEquipe({ veiculos, talhoes })
  const [aba, setAba] = useState<Aba>('operadores')
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [busca, setBusca] = useState('')
  const [alocando, setAlocando] = useState<{ operador?: Operador } | null>(null)

  const conta = (s: SituacaoOperador) => operadores.filter((o) => o.situacao === s).length
  const maquinasLivres = veiculos.filter((v) => v.status === 'DISPONIVEL' && !alocacaoPorVeiculo.has(v.id)).length
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return operadores.filter(
      (o) => (filtro === 'TODOS' || o.situacao === filtro) && (!termo || o.nome.toLowerCase().includes(termo) || o.matricula.toLowerCase().includes(termo)),
    )
  }, [operadores, filtro, busca])

  return (
    <>
      <PageHeader
        titulo="Equipe de campo"
        subtitulo="Quem está disponível hoje, quem está em atividade e em qual máquina ou talhão."
        acoes={<Button icon={UserPlus} onClick={() => setAlocando({})}>Alocar em atividade</Button>}
      />

      <Indicadores className="mb-5">
        <Indicador icon={UserCheck} rotulo="Disponíveis" valor={conta('DISPONIVEL')} detalhe="Prontos para alocar" />
        <Indicador icon={Users} rotulo="Em atividade" valor={conta('EM_ATIVIDADE')} detalhe={`de ${operadores.length} na equipe`} />
        <Indicador icon={CalendarOff} rotulo="Ausentes" valor={conta('AUSENTE')} detalhe="Férias, folga ou atestado" />
        <Indicador icon={Tractor} rotulo="Máquinas livres" valor={maquinasLivres} detalhe={`de ${veiculos.length} na frota`} to="/frota" />
      </Indicadores>

      <Abas<Aba>
        valor={aba}
        onChange={setAba}
        opcoes={[
          { valor: 'operadores', label: 'Operadores', contagem: operadores.length },
          { valor: 'atividades', label: 'Atividades em andamento', contagem: conta('EM_ATIVIDADE') },
        ]}
      />

      {isLoading ? (
        <Carregando />
      ) : error ? (
        <Erro erro={error} onTentar={refetch} />
      ) : aba === 'atividades' ? (
        <ListaAtividades operadores={operadores} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmentado<Filtro>
                valor={filtro}
                onChange={setFiltro}
                opcoes={[
                  { valor: 'TODOS', label: 'Todos' },
                  { valor: 'DISPONIVEL', label: `Disponíveis (${conta('DISPONIVEL')})` },
                  { valor: 'EM_ATIVIDADE', label: 'Em atividade' },
                  { valor: 'AUSENTE', label: 'Ausentes' },
                ]}
              />
            </div>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou matrícula" className="pl-9" aria-label="Buscar operador" />
            </div>
          </div>
          {filtrados.length === 0 ? (
            <Vazio icon={Users} titulo="Nenhum operador neste filtro" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((o) => (
                <CartaoOperador key={o.id} o={o} onAlocar={() => setAlocando({ operador: o })} />
              ))}
            </div>
          )}
        </>
      )}

      <AlocarSheet
        aberto={!!alocando}
        onFechar={() => setAlocando(null)}
        operadores={operadores}
        veiculos={veiculos}
        talhoes={talhoes}
        ocupacao={alocacaoPorVeiculo}
        operadorInicial={alocando?.operador}
      />
    </>
  )
}
