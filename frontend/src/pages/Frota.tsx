import { clsx } from 'clsx'
import { CloudOff, Gauge, Pencil, Plus, Tractor, UserPlus, Wrench } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Carregando, Erro, Field, Input, PageHeader, Select, Sheet, Textarea, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { diasAte, fmtData, fmtNumero, STATUS_VEICULO, TIPOS_VEICULO } from '@/lib/format'
import type { Alocacao, StatusVeiculo, Talhao, TipoVeiculo, Veiculo, VeiculoInput } from '@/lib/types'
import { useDados, useEscrita } from '@/offline/hooks'
import { AlocarSheet } from './equipe/AlocarSheet'
import { iniciais, resumoAtividade } from './equipe/componentes'
import { useEquipe } from './equipe/hooks'

const tomStatus = { DISPONIVEL: 'verde', EM_OPERACAO: 'azul', MANUTENCAO: 'amarelo', INATIVO: 'neutro' } as const
const RODOVIARIOS: TipoVeiculo[] = ['CAMINHAO', 'UTILITARIO']

function VeiculoCard({ v, alocacao, onEditar, onAlocar }: { v: Veiculo; alocacao?: Alocacao; onEditar: () => void; onAlocar: () => void }) {
  const podeAlocar = !alocacao && v.status !== 'INATIVO'
  const dias = v.proximaManutencao ? diasAte(v.proximaManutencao) : undefined
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-stone-200 bg-white p-2 text-stone-600">
            <Tractor className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">{v.modelo}</p>
            <p className="text-xs text-stone-500">
              {v.identificacao} · {TIPOS_VEICULO[v.tipo]} · {v.ano}
            </p>
          </div>
        </div>
        <Badge tom={tomStatus[v.status]}>{STATUS_VEICULO[v.status]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-md bg-stone-50 p-2">
          <Gauge className="h-4 w-4 text-stone-400" />
          <span className="tabular-nums">
            {fmtNumero(v.horimetro)} {RODOVIARIOS.includes(v.tipo) ? 'km' : 'h'}
          </span>
        </div>
        <div className={clsx('flex items-center gap-2 rounded-md p-2', v.manutencaoPendente ? 'bg-amber-50 text-amber-800' : 'bg-stone-50')}>
          <Wrench className="h-4 w-4 shrink-0 opacity-60" />
          <span className="truncate">
            {dias === undefined ? 'Sem revisão' : dias < 0 ? `Revisão vencida (${fmtData(v.proximaManutencao)})` : `Revisão ${fmtData(v.proximaManutencao)}`}
          </span>
        </div>
      </div>
      {v.observacoes && <p className="text-sm text-stone-600">{v.observacoes}</p>}
      <div className="flex items-center gap-2.5 rounded-md border border-stone-200 px-2.5 py-2">
        {alocacao ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-700">{iniciais(alocacao.operadorNome)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-stone-800">{alocacao.operadorNome}</p>
              <p className="truncate text-xs text-stone-500">{resumoAtividade(alocacao)}</p>
            </div>
            {alocacao.pendente && (
              <Badge tom="amarelo">
                <CloudOff className="h-3 w-3" /> Na fila
              </Badge>
            )}
          </>
        ) : (
          <p className="flex-1 text-xs text-stone-500">Sem operador alocado</p>
        )}
      </div>
      <div className="mt-auto flex gap-2">
        <Button variant="secondary" size="sm" icon={Pencil} onClick={onEditar}>
          Atualizar
        </Button>
        {podeAlocar && (
          <Button variant="secondary" size="sm" icon={UserPlus} onClick={onAlocar}>
            {v.status === 'MANUTENCAO' ? 'Alocar mecânico' : 'Alocar operador'}
          </Button>
        )}
      </div>
    </Card>
  )
}

const vazio: VeiculoInput = { identificacao: '', modelo: '', tipo: 'TRATOR', ano: new Date().getFullYear(), horimetro: 0, status: 'DISPONIVEL' }

function VeiculoSheet({ aberto, onFechar, veiculo }: { aberto: boolean; onFechar: () => void; veiculo?: Veiculo }) {
  const toast = useToast()
  const salvar = useEscrita<VeiculoInput>((v) => ({
    metodo: veiculo ? 'PUT' : 'POST',
    caminho: veiculo ? `/veiculos/${veiculo.id}` : '/veiculos',
    corpo: v,
    descricao: `${veiculo ? 'Atualização' : 'Cadastro'} do veículo ${v.identificacao}`,
  }))
  const [f, setF] = useState<VeiculoInput>(vazio)
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (aberto) {
      setF(veiculo ?? vazio)
      setErro(undefined)
    }
  }, [aberto, veiculo])

  const set = <K extends keyof VeiculoInput>(k: K, v: VeiculoInput[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await salvar.mutateAsync({ ...f, proximaManutencao: f.proximaManutencao || undefined })
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Veículo salvo' : 'Salvo offline, será sincronizado')
      onFechar()
    } catch (err) {
      setErro(err instanceof ApiError && err.campos ? Object.values(err.campos).join(' · ') : err instanceof Error ? err.message : 'Erro')
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={veiculo ? 'Atualizar veículo' : 'Novo veículo'}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Placa / patrimônio">{(id) => <Input id={id} value={f.identificacao} onChange={(e) => set('identificacao', e.target.value.toUpperCase())} required />}</Field>
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={f.tipo} onChange={(e) => set('tipo', e.target.value as TipoVeiculo)}>
                {Object.entries(TIPOS_VEICULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Modelo">{(id) => <Input id={id} value={f.modelo} onChange={(e) => set('modelo', e.target.value)} required />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ano">{(id) => <Input id={id} type="number" min={1950} max={2100} value={f.ano} onChange={(e) => set('ano', Number(e.target.value))} required />}</Field>
          <Field label={RODOVIARIOS.includes(f.tipo) ? 'Odômetro (km)' : 'Horímetro (h)'} dica={veiculo ? `Atual: ${fmtNumero(veiculo.horimetro)}` : undefined}>
            {(id) => <Input id={id} type="number" min={veiculo?.horimetro ?? 0} step="any" inputMode="decimal" value={f.horimetro} onChange={(e) => set('horimetro', Number(e.target.value))} required />}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            {(id) => (
              <Select id={id} value={f.status} onChange={(e) => set('status', e.target.value as StatusVeiculo)}>
                {Object.entries(STATUS_VEICULO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Próxima revisão">{(id) => <Input id={id} type="date" value={f.proximaManutencao ?? ''} onChange={(e) => set('proximaManutencao', e.target.value)} />}</Field>
        </div>
        <Field label="Observações">{(id) => <Textarea id={id} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} maxLength={500} />}</Field>
        {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={salvar.isPending}>Salvar</Button>
      </form>
    </Sheet>
  )
}

export default function Frota() {
  const { data, isLoading, error, refetch } = useDados<Veiculo[]>('/veiculos')
  const [editando, setEditando] = useState<{ veiculo?: Veiculo } | null>(null)

  // Atalho do roteiro de primeiros passos: ?novo=1 abre o cadastro.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('novo') === '1') {
      setEditando({})
      setParams({}, { replace: true })
    }
  }, [params, setParams])
  const [alocando, setAlocando] = useState<Veiculo>()
  const { data: talhoes = [] } = useDados<Talhao[]>('/talhoes')
  const { operadores, alocacaoPorVeiculo } = useEquipe({ veiculos: data ?? [], talhoes })
  const pendentes = (data ?? []).filter((v) => v.manutencaoPendente).length
  const emManutencao = (data ?? []).filter((v) => v.status === 'MANUTENCAO').length

  return (
    <>
      <PageHeader
        titulo="Frota"
        subtitulo={`${data?.length ?? 0} máquinas · ${emManutencao} na oficina · ${pendentes} revisão(ões) próxima(s)`}
        acoes={<Button icon={Plus} onClick={() => setEditando({})}>Novo</Button>}
      />
      {isLoading ? (
        <Carregando />
      ) : error ? (
        <Erro erro={error} onTentar={refetch} />
      ) : !data?.length ? (
        <Vazio icon={Tractor} titulo="Nenhum veículo cadastrado" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.map((v) => (
            <VeiculoCard key={v.id} v={v} alocacao={alocacaoPorVeiculo.get(v.id)} onEditar={() => setEditando({ veiculo: v })} onAlocar={() => setAlocando(v)} />
          ))}
        </div>
      )}
      <VeiculoSheet aberto={!!editando} onFechar={() => setEditando(null)} veiculo={editando?.veiculo} />
      <AlocarSheet
        aberto={!!alocando}
        onFechar={() => setAlocando(undefined)}
        operadores={operadores}
        veiculos={data ?? []}
        talhoes={talhoes}
        ocupacao={alocacaoPorVeiculo}
        veiculoInicial={alocando}
      />
    </>
  )
}
