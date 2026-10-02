import { CalendarClock, CheckCircle2, Pencil, Plus, Wheat } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Badge, Barra, Button, Card, Carregando, Erro, Field, Input, PageHeader, Select, Sheet, Textarea, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { diasAte, fmtData, fmtNumero, hojeISO, STATUS_COLHEITA } from '@/lib/format'
import type { Colheita, ColheitaInput, Produto, StatusColheita } from '@/lib/types'
import { useDados, useEscrita } from '@/offline/hooks'

const tomStatus = { PLANEJADA: 'azul', EM_ANDAMENTO: 'amarelo', CONCLUIDA: 'verde' } as const

function progresso(c: Colheita) {
  const inicio = new Date(c.dataPlantio).getTime()
  const fim = new Date(c.previsaoColheita).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - inicio) / (fim - inicio)) * 100))
}

function ColheitaCard({ c, onEditar, onConcluir }: { c: Colheita; onEditar: () => void; onConcluir: () => void }) {
  const dias = diasAte(c.previsaoColheita)
  const concluida = c.status === 'CONCLUIDA'
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Talhão {c.talhao}</p>
          <p className="text-lg font-semibold">{c.cultura}</p>
          <p className="text-sm text-stone-500">{fmtNumero(c.areaHa)} ha{c.produtoNome && ` · destino: ${c.produtoNome}`}</p>
        </div>
        <Badge tom={tomStatus[c.status]}>{STATUS_COLHEITA[c.status]}</Badge>
      </div>

      {!concluida && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-stone-500">
            <span>Plantio {fmtData(c.dataPlantio)}</span>
            <span className={dias <= 7 ? 'font-medium text-amber-700' : ''}>
              {dias > 0 ? `colheita em ${dias} dia${dias > 1 ? 's' : ''}` : dias === 0 ? 'colheita hoje' : `atrasada ${-dias} dia(s)`}
            </span>
          </div>
          <Barra valor={progresso(c)} max={100} tom={dias < 0 ? 'vermelho' : dias <= 7 ? 'amarelo' : 'verde'} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-stone-50 p-2">
          <dt className="text-xs text-stone-500">{concluida ? 'Produção' : 'Estimativa'}</dt>
          <dd className="font-semibold tabular-nums">{fmtNumero((concluida ? c.producaoRealKg : c.producaoEstimadaKg) ?? undefined)} kg</dd>
        </div>
        <div className="rounded-xl bg-stone-50 p-2">
          <dt className="text-xs text-stone-500">Produtividade</dt>
          <dd className="font-semibold tabular-nums">{c.produtividadeSacasHa ? `${fmtNumero(c.produtividadeSacasHa)} sc/ha` : '—'}</dd>
        </div>
      </dl>

      {c.observacoes && <p className="text-sm text-stone-600">{c.observacoes}</p>}

      {concluida ? (
        <p className="flex items-center gap-1.5 text-sm text-brand-700">
          <CheckCircle2 className="h-4 w-4" /> Colhida em {fmtData(c.dataColheita)}
        </p>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Pencil} onClick={onEditar}>Editar</Button>
          <Button size="sm" icon={CheckCircle2} onClick={onConcluir} className="flex-1">Concluir colheita</Button>
        </div>
      )}
    </Card>
  )
}

function ColheitaSheet({ aberto, onFechar, colheita, produtos }: { aberto: boolean; onFechar: () => void; colheita?: Colheita; produtos: Produto[] }) {
  const toast = useToast()
  const salvar = useEscrita<ColheitaInput>((c) => ({
    metodo: colheita ? 'PUT' : 'POST',
    caminho: colheita ? `/colheitas/${colheita.id}` : '/colheitas',
    corpo: c,
    descricao: `${colheita ? 'Edição' : 'Cadastro'} da colheita ${c.cultura} (${c.talhao})`,
  }))
  const [f, setF] = useState<ColheitaInput>({ talhao: '', cultura: '', areaHa: 0, dataPlantio: hojeISO(), previsaoColheita: hojeISO() })
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (!aberto) return
    setErro(undefined)
    setF(colheita ?? { talhao: '', cultura: '', areaHa: 0, dataPlantio: hojeISO(), previsaoColheita: hojeISO(), status: 'PLANEJADA' })
  }, [aberto, colheita])

  const set = <K extends keyof ColheitaInput>(k: K, v: ColheitaInput[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await salvar.mutateAsync(f)
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Colheita salva' : 'Salvo offline, será sincronizado')
      onFechar()
    } catch (err) {
      setErro(err instanceof ApiError && err.campos ? Object.values(err.campos).join(' · ') : err instanceof Error ? err.message : 'Erro')
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={colheita ? 'Editar colheita' : 'Nova colheita'}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Talhão">{(id) => <Input id={id} value={f.talhao} onChange={(e) => set('talhao', e.target.value)} required placeholder="T-06" />}</Field>
          <Field label="Cultura">{(id) => <Input id={id} value={f.cultura} onChange={(e) => set('cultura', e.target.value)} required placeholder="Soja" />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área (ha)">{(id) => <Input id={id} type="number" min={0.01} step="any" inputMode="decimal" value={f.areaHa || ''} onChange={(e) => set('areaHa', Number(e.target.value))} required />}</Field>
          <Field label="Estimativa (kg)">{(id) => <Input id={id} type="number" min={0} step="any" inputMode="decimal" value={f.producaoEstimadaKg ?? ''} onChange={(e) => set('producaoEstimadaKg', e.target.value ? Number(e.target.value) : undefined)} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plantio">{(id) => <Input id={id} type="date" value={f.dataPlantio} onChange={(e) => set('dataPlantio', e.target.value)} required />}</Field>
          <Field label="Previsão de colheita">{(id) => <Input id={id} type="date" value={f.previsaoColheita} min={f.dataPlantio} onChange={(e) => set('previsaoColheita', e.target.value)} required />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            {(id) => (
              <Select id={id} value={f.status ?? 'PLANEJADA'} onChange={(e) => set('status', e.target.value as StatusColheita)}>
                <option value="PLANEJADA">Planejada</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
              </Select>
            )}
          </Field>
          <Field label="Destino no estoque">
            {(id) => (
              <Select id={id} value={f.produtoId ?? ''} onChange={(e) => set('produtoId', Number(e.target.value) || undefined)}>
                <option value="">Nenhum</option>
                {produtos.filter((p) => ['KG', 'SACA', 'TONELADA'].includes(p.unidade)).map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Observações">{(id) => <Textarea id={id} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} maxLength={500} />}</Field>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={salvar.isPending}>Salvar</Button>
      </form>
    </Sheet>
  )
}

function ConcluirSheet({ colheita, onFechar }: { colheita?: Colheita; onFechar: () => void }) {
  const toast = useToast()
  const concluir = useEscrita<{ dataColheita: string; producaoRealKg: number }>((corpo) => ({
    metodo: 'POST',
    caminho: `/colheitas/${colheita!.id}/concluir`,
    corpo,
    descricao: `Conclusão da colheita ${colheita!.cultura} (${colheita!.talhao})`,
  }))
  const [data, setData] = useState(hojeISO())
  const [kg, setKg] = useState('')
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    setData(hojeISO())
    setKg(colheita?.producaoEstimadaKg ? String(colheita.producaoEstimadaKg) : '')
    setErro(undefined)
  }, [colheita])

  const sacasHa = colheita && Number(kg) > 0 ? Number(kg) / 60 / colheita.areaHa : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await concluir.mutateAsync({ dataColheita: data, producaoRealKg: Number(kg) })
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Colheita concluída e lançada no estoque' : 'Salvo offline, será sincronizado')
      onFechar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro')
    }
  }

  return (
    <Sheet aberto={!!colheita} onFechar={onFechar} titulo="Concluir colheita">
      {colheita && (
        <form onSubmit={enviar} className="space-y-4">
          <p className="text-sm text-stone-600">
            {colheita.cultura} · talhão {colheita.talhao} · {fmtNumero(colheita.areaHa)} ha
            {colheita.produtoNome && (
              <>
                <br />A produção entrará automaticamente no estoque de <strong>{colheita.produtoNome}</strong>.
              </>
            )}
          </p>
          <Field label="Data da colheita">{(id) => <Input id={id} type="date" value={data} max={hojeISO()} onChange={(e) => setData(e.target.value)} required />}</Field>
          <Field label="Produção total (kg)" dica={sacasHa ? `≈ ${fmtNumero(Math.round(sacasHa * 10) / 10)} sacas/ha` : undefined}>
            {(id) => <Input id={id} type="number" min={1} step="any" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} required />}
          </Field>
          {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <Button type="submit" className="w-full" icon={CheckCircle2} carregando={concluir.isPending}>Concluir</Button>
        </form>
      )}
    </Sheet>
  )
}

export default function Colheitas() {
  const { data, isLoading, error, refetch } = useDados<Colheita[]>('/colheitas')
  const { data: produtos = [] } = useDados<Produto[]>('/produtos')
  const [editando, setEditando] = useState<{ colheita?: Colheita } | null>(null)
  const [concluindo, setConcluindo] = useState<Colheita>()

  const abertas = (data ?? []).filter((c) => c.status !== 'CONCLUIDA')
  const concluidas = (data ?? []).filter((c) => c.status === 'CONCLUIDA')

  return (
    <>
      <PageHeader
        titulo="Colheitas"
        subtitulo={`${abertas.length} em aberto · ${fmtNumero(abertas.reduce((s, c) => s + c.areaHa, 0))} ha`}
        acoes={<Button icon={Plus} onClick={() => setEditando({})}>Nova</Button>}
      />
      {isLoading ? (
        <Carregando />
      ) : error ? (
        <Erro erro={error} onTentar={refetch} />
      ) : !data?.length ? (
        <Vazio icon={Wheat} titulo="Nenhuma colheita cadastrada" acao={<Button icon={Plus} onClick={() => setEditando({})}>Cadastrar</Button>} />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {abertas.map((c) => (
              <ColheitaCard key={c.id} c={c} onEditar={() => setEditando({ colheita: c })} onConcluir={() => setConcluindo(c)} />
            ))}
          </section>
          {concluidas.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-600">
                <CalendarClock className="h-4 w-4" /> Safras concluídas
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {concluidas.map((c) => (
                  <ColheitaCard key={c.id} c={c} onEditar={() => {}} onConcluir={() => {}} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <ColheitaSheet aberto={!!editando} onFechar={() => setEditando(null)} colheita={editando?.colheita} produtos={produtos} />
      <ConcluirSheet colheita={concluindo} onFechar={() => setConcluindo(undefined)} />
    </>
  )
}
