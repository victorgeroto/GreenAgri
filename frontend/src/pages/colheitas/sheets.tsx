import { CheckCircle2, Cpu, User } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Sheet, Textarea } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { fmtDataHora, fmtNumero, hojeISO, safraDe, STATUS_COLHEITA } from '@/lib/format'
import { areaHa, paraGeoJSON, type LatLng } from '@/lib/geo'
import type { Colheita, ColheitaInput, Produto, StatusColheita, Talhao } from '@/lib/types'
import { useEscrita } from '@/offline/hooks'
import { COR_STATUS } from './cores'
import { useEventos, useSalvarColheita, useSalvarTalhao } from './hooks'

function mensagem(err: unknown) {
  if (err instanceof ApiError && err.campos) return Object.values(err.campos).join(' · ')
  return err instanceof Error ? err.message : 'Erro ao salvar'
}

function useAvisoEnvio() {
  const toast = useToast()
  return (status: 'enviado' | 'na-fila', ok: string) =>
    toast(status === 'enviado' ? 'sucesso' : 'fila', status === 'enviado' ? ok : 'Sem conexão: salvo e será sincronizado')
}

export function ColheitaSheet({ aberto, onFechar, colheita, talhoes, produtos, talhaoInicial }: {
  aberto: boolean
  onFechar: () => void
  colheita?: Colheita
  talhoes: Talhao[]
  produtos: Produto[]
  talhaoInicial?: Talhao
}) {
  const avisar = useAvisoEnvio()
  const salvar = useSalvarColheita(colheita?.id)
  const [f, setF] = useState<ColheitaInput>({ talhaoId: 0, cultura: '', dataPlantio: hojeISO(), previsaoColheita: hojeISO() })
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (!aberto) return
    setErro(undefined)
    setF(
      colheita
        ? { ...colheita, status: undefined }
        : { talhaoId: talhaoInicial?.id ?? 0, cultura: '', dataPlantio: hojeISO(), previsaoColheita: hojeISO(), status: 'PLANEJADA' },
    )
  }, [aberto, colheita, talhaoInicial])

  const set = <K extends keyof ColheitaInput>(k: K, v: ColheitaInput[K]) => setF((x) => ({ ...x, [k]: v }))
  const talhao = talhoes.find((t) => t.id === f.talhaoId)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    try {
      const r = await salvar.mutateAsync({ ...f, talhaoCodigo: talhao?.codigo ?? '' })
      avisar(r.status, 'Colheita salva')
      onFechar()
    } catch (err) {
      setErro(mensagem(err))
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={colheita ? 'Editar colheita' : 'Nova colheita'}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Talhão">
            {(id) => (
              <Select id={id} value={f.talhaoId || ''} onChange={(e) => set('talhaoId', Number(e.target.value))} required>
                <option value="">Selecione…</option>
                {talhoes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} · {t.nome}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Cultura">{(id) => <Input id={id} value={f.cultura} onChange={(e) => set('cultura', e.target.value)} required placeholder="Soja" />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plantio">{(id) => <Input id={id} type="date" value={f.dataPlantio} onChange={(e) => set('dataPlantio', e.target.value)} required />}</Field>
          <Field label="Previsão de colheita">{(id) => <Input id={id} type="date" value={f.previsaoColheita} min={f.dataPlantio} onChange={(e) => set('previsaoColheita', e.target.value)} required />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Safra" dica={f.safra ? undefined : `Automática: ${safraDe(f.dataPlantio)}`}>
            {(id) => <Input id={id} value={f.safra ?? ''} onChange={(e) => set('safra', e.target.value || undefined)} placeholder={safraDe(f.dataPlantio)} pattern="\d{4}/\d{2}" />}
          </Field>
          <Field label="Área (ha)" dica={!f.areaHa && talhao?.areaHa ? `Do talhão: ${fmtNumero(talhao.areaHa)} ha` : undefined}>
            {(id) => (
              <Input id={id} type="number" min={0.01} step="any" inputMode="decimal" value={f.areaHa ?? ''} placeholder={talhao?.areaHa ? String(talhao.areaHa) : ''} onChange={(e) => set('areaHa', e.target.value ? Number(e.target.value) : undefined)} required={!talhao?.areaHa} />
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimativa (kg)">{(id) => <Input id={id} type="number" min={0} step="any" inputMode="decimal" value={f.producaoEstimadaKg ?? ''} onChange={(e) => set('producaoEstimadaKg', e.target.value ? Number(e.target.value) : undefined)} />}</Field>
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
        {!colheita && (
          <Field label="Situação">
            {(id) => (
              <Select id={id} value={f.status ?? 'PLANEJADA'} onChange={(e) => set('status', e.target.value as StatusColheita)}>
                <option value="PLANEJADA">Planejada</option>
                <option value="EM_DESENVOLVIMENTO">Já plantada (em desenvolvimento)</option>
              </Select>
            )}
          </Field>
        )}
        <Field label="Observações">{(id) => <Textarea id={id} value={f.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} maxLength={500} />}</Field>
        {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={salvar.isPending}>Salvar</Button>
      </form>
    </Sheet>
  )
}

export function ConcluirSheet({ colheita, onFechar }: { colheita?: Colheita; onFechar: () => void }) {
  const avisar = useAvisoEnvio()
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
      avisar(r.status, 'Colheita concluída e lançada no estoque')
      onFechar()
    } catch (err) {
      setErro(mensagem(err))
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
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <Button type="submit" className="w-full" icon={CheckCircle2} carregando={concluir.isPending}>Concluir</Button>
        </form>
      )}
    </Sheet>
  )
}

/** Linha do tempo das mudanças de status, com a origem (pessoa ou dispositivo). */
export function LinhaDoTempo({ colheitaId }: { colheitaId: number }) {
  const { data, isLoading } = useEventos(colheitaId)
  if (isLoading) return <p className="text-xs text-stone-500">Carregando histórico…</p>
  if (!data?.length) return <p className="text-xs text-stone-500">Sem histórico registrado.</p>
  return (
    <ol className="relative ml-1.5 space-y-3 border-l border-stone-200 pl-4">
      {[...data].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: COR_STATUS[e.statusNovo] }} aria-hidden />
          <p className="text-sm font-medium text-stone-900">{STATUS_COLHEITA[e.statusNovo]}</p>
          <p className="flex items-center gap-1 text-xs text-stone-500">
            {e.origem === 'DISPOSITIVO' ? <Cpu className="h-3 w-3" aria-label="Dispositivo" /> : <User className="h-3 w-3" aria-label="Usuário" />}
            {fmtDataHora(e.ocorridoEm)} · {e.responsavel ?? '—'}
          </p>
          {e.observacao && e.observacao !== 'Importado' && <p className="text-xs text-stone-600">{e.observacao}</p>}
        </li>
      ))}
    </ol>
  )
}

/** Salva o polígono desenhado no mapa como um novo talhão. */
export function TalhaoSheet({ pontos, onFechar, onSalvo }: { pontos: LatLng[] | null; onFechar: () => void; onSalvo: () => void }) {
  const avisar = useAvisoEnvio()
  const salvar = useSalvarTalhao()
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    setCodigo('')
    setNome('')
    setErro(undefined)
  }, [pontos])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!pontos) return
    try {
      const r = await salvar.mutateAsync({ codigo, nome, geometria: paraGeoJSON(pontos) })
      avisar(r.status, `Talhão ${codigo.toUpperCase()} cadastrado`)
      onSalvo()
    } catch (err) {
      setErro(mensagem(err))
    }
  }

  return (
    <Sheet aberto={!!pontos} onFechar={onFechar} titulo="Novo talhão">
      {pontos && (
        <form onSubmit={enviar} className="space-y-4">
          <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-900">
            {pontos.length} vértices · área calculada de <strong>{fmtNumero(Math.round(areaHa(pontos) * 100) / 100)} ha</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código">{(id) => <Input id={id} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} required maxLength={20} placeholder="T-06" />}</Field>
            <Field label="Nome">{(id) => <Input id={id} value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} placeholder="Talhão do Ipê" />}</Field>
          </div>
          {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          <Button type="submit" className="w-full" carregando={salvar.isPending}>Salvar talhão</Button>
        </form>
      )}
    </Sheet>
  )
}
