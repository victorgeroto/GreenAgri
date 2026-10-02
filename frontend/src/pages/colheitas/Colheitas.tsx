import { clsx } from 'clsx'
import { CheckCircle2, ChevronDown, CloudOff, Cpu, History, Map as MapIcon, Pencil, Plus, Wheat } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Badge, Barra, Button, Card, Carregando, Erro, PageHeader, Segmentado, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { diasAte, fmtData, fmtNumero, fmtRelativo, STATUS_COLHEITA } from '@/lib/format'
import type { LatLng } from '@/lib/geo'
import type { Colheita, Dispositivo, Produto, StatusColheita, Talhao } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { COR_STATUS } from './cores'
import { MapaFazenda } from './MapaFazenda'
import { proximoStatus, useColheitas, useMudarStatus, useTalhoes } from './hooks'
import { ColheitaSheet, ConcluirSheet, LinhaDoTempo, TalhaoSheet } from './sheets'

/** "agora" = o que ocupa cada talhão hoje; as demais opções separam por ano-safra. */
type Filtro = 'agora' | string
type Visao = 'mapa' | 'lista'

export function StatusBadge({ c }: { c: Colheita }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-white px-1.5 py-0.5 text-xs font-medium text-stone-800 ring-1 ring-inset ring-stone-200">
      <span className="h-2 w-2 rounded-full" style={{ background: COR_STATUS[c.status] }} aria-hidden />
      {STATUS_COLHEITA[c.status]}
      {c.statusPendente && <CloudOff className="h-3 w-3 text-amber-600" aria-label="na fila" />}
    </span>
  )
}

function progresso(c: Colheita) {
  const inicio = new Date(c.dataPlantio).getTime()
  const fim = new Date(c.previsaoColheita).getTime()
  return Math.min(100, Math.max(0, ((Date.now() - inicio) / (fim - inicio)) * 100))
}

/** Colheita que representa o talhão no filtro atual. */
function escolherPorTalhao(colheitas: Colheita[], filtro: Filtro) {
  const mapa = new Map<number, Colheita>()
  const candidatas = filtro === 'agora' ? colheitas.filter((c) => c.status !== 'CONCLUIDA') : colheitas.filter((c) => c.safra === filtro)
  for (const c of [...candidatas].sort((a, b) => a.dataPlantio.localeCompare(b.dataPlantio))) {
    const atual = mapa.get(c.talhaoId)
    // Prioriza a lavoura ocupando o talhão; senão, a mais recente.
    if (!atual || c.status === 'EM_DESENVOLVIMENTO' || c.status === 'EM_COLHEITA' || atual.status === 'CONCLUIDA') mapa.set(c.talhaoId, c)
  }
  return mapa
}

function Acoes({ c, onConcluir }: { c: Colheita; onConcluir: (c: Colheita) => void }) {
  const mudar = useMudarStatus()
  const toast = useToast()
  const proximo = proximoStatus(c.status)
  if (c.status === 'CONCLUIDA' || c.statusPendente) return null

  async function avancar(status: StatusColheita) {
    try {
      const r = await mudar.mutateAsync({ colheita: c, status })
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? `${c.talhao}: ${STATUS_COLHEITA[status]}` : 'Sem conexão: mudança salva e será sincronizada')
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Não foi possível mudar o status')
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {proximo && (
        <Button size="sm" variant="secondary" onClick={() => avancar(proximo.status)} carregando={mudar.isPending}>
          {proximo.acao}
        </Button>
      )}
      {c.status !== 'PLANEJADA' && (
        <Button size="sm" icon={CheckCircle2} onClick={() => onConcluir(c)}>
          Concluir
        </Button>
      )}
    </div>
  )
}

function ColheitaCard({ c, onEditar, onConcluir }: { c: Colheita; onEditar: () => void; onConcluir: (c: Colheita) => void }) {
  const [historico, setHistorico] = useState(false)
  const dias = diasAte(c.previsaoColheita)
  const concluida = c.status === 'CONCLUIDA'
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Talhão {c.talhao} · safra {c.safra}
          </p>
          <p className="text-lg font-semibold">{c.cultura}</p>
          <p className="text-sm text-stone-500">{fmtNumero(c.areaHa)} ha{c.produtoNome && ` · destino: ${c.produtoNome}`}</p>
        </div>
        <StatusBadge c={c} />
      </div>

      {!concluida && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-stone-500">
            <span>Plantio {fmtData(c.dataPlantio)}</span>
            <span className={dias <= 7 ? 'font-medium text-amber-700' : ''}>
              {dias > 0 ? `colheita em ${dias} dia${dias > 1 ? 's' : ''}` : dias === 0 ? 'colheita hoje' : `previsão vencida há ${-dias} dia(s)`}
            </span>
          </div>
          <Barra valor={progresso(c)} max={100} tom={dias < 0 ? 'vermelho' : dias <= 7 ? 'amarelo' : 'verde'} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-stone-50 p-2">
          <dt className="text-xs text-stone-500">{concluida ? 'Produção' : 'Estimativa'}</dt>
          <dd className="font-semibold tabular-nums">{fmtNumero((concluida ? c.producaoRealKg : c.producaoEstimadaKg) ?? undefined)} kg</dd>
        </div>
        <div className="rounded-md bg-stone-50 p-2">
          <dt className="text-xs text-stone-500">Produtividade</dt>
          <dd className="font-semibold tabular-nums">{c.produtividadeSacasHa ? `${fmtNumero(c.produtividadeSacasHa)} sc/ha` : '—'}</dd>
        </div>
      </dl>

      <p className="text-xs text-stone-500">{STATUS_COLHEITA[c.status]} desde {fmtRelativo(c.statusDesde)}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Acoes c={c} onConcluir={onConcluir} />
        <div className="flex gap-1">
          {!concluida && <Button variant="ghost" size="sm" icon={Pencil} onClick={onEditar} aria-label="Editar" />}
          <Button variant="ghost" size="sm" icon={History} onClick={() => setHistorico((h) => !h)} aria-expanded={historico}>
            Histórico
          </Button>
        </div>
      </div>
      {historico && <LinhaDoTempo colheitaId={c.id} />}
    </Card>
  )
}

/** Painel do talhão: lavoura atual + rotação por safra, com a linha do tempo de cada uma. */
function PainelTalhao({ t, colheitas, filtro, onNova, onConcluir }: { t: Talhao; colheitas: Colheita[]; filtro: Filtro; onNova: () => void; onConcluir: (c: Colheita) => void }) {
  const doTalhao = colheitas.filter((c) => c.talhaoId === t.id).sort((a, b) => b.dataPlantio.localeCompare(a.dataPlantio))
  const [aberta, setAberta] = useState<number | undefined>(doTalhao.find((c) => c.status !== 'CONCLUIDA')?.id)
  const porSafra = doTalhao.reduce<Record<string, Colheita[]>>((acc, c) => ({ ...acc, [c.safra]: [...(acc[c.safra] ?? []), c] }), {})

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t.codigo}</p>
          <h2 className="text-lg font-semibold">{t.nome}</h2>
          <p className="text-sm text-stone-500">{t.areaHa ? `${fmtNumero(t.areaHa)} ha` : 'Área não desenhada'}</p>
        </div>
        <Button size="sm" variant="secondary" icon={Plus} onClick={onNova}>
          Colheita
        </Button>
      </div>

      {doTalhao.length === 0 && <p className="text-sm text-stone-500">Nenhuma lavoura registrada neste talhão.</p>}

      {Object.entries(porSafra).map(([safra, lista]) => (
        <section key={safra}>
          <h3 className={clsx('mb-1.5 text-xs font-semibold uppercase tracking-wide', filtro === safra ? 'text-brand-800' : 'text-stone-500')}>Safra {safra}</h3>
          <ul className="space-y-2">
            {lista.map((c) => (
              <li key={c.id} className="rounded-md border border-stone-200">
                <button className="flex w-full items-center justify-between gap-2 p-3 text-left" onClick={() => setAberta(aberta === c.id ? undefined : c.id)} aria-expanded={aberta === c.id}>
                  <span>
                    <span className="block text-sm font-medium">{c.cultura}</span>
                    <span className="text-xs text-stone-500">
                      {fmtData(c.dataPlantio)} → {fmtData(c.dataColheita ?? c.previsaoColheita)}
                      {c.produtividadeSacasHa && ` · ${fmtNumero(c.produtividadeSacasHa)} sc/ha`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge c={c} />
                    <ChevronDown className={clsx('h-4 w-4 text-stone-400 transition-transform', aberta === c.id && 'rotate-180')} />
                  </span>
                </button>
                {aberta === c.id && (
                  <div className="space-y-3 border-t border-stone-100 p-3">
                    <Acoes c={c} onConcluir={onConcluir} />
                    <LinhaDoTempo colheitaId={c.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="flex items-start gap-1.5 text-xs text-stone-500">
        <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Quando a colheitadeira com rastreador começa a operar dentro do talhão, a colheita passa para "Em colheita" automaticamente.
      </p>
    </Card>
  )
}

export default function Colheitas() {
  const { colheitas, safras, isLoading, error, refetch } = useColheitas()
  const { data: talhoes = [] } = useTalhoes()
  const { data: produtos = [] } = useDados<Produto[]>('/produtos')
  const { data: dispositivos = [] } = useDados<Dispositivo[]>('/iot/dispositivos', { refetchInterval: 15_000 })
  const [filtro, setFiltro] = useState<Filtro>('agora')
  const [visao, setVisao] = useState<Visao>('mapa')
  const [selecionado, setSelecionado] = useState<Talhao>()
  const [editando, setEditando] = useState<{ colheita?: Colheita; talhao?: Talhao } | null>(null)
  const [concluindo, setConcluindo] = useState<Colheita>()
  const [desenho, setDesenho] = useState<LatLng[] | null>(null)
  const painelRef = useRef<HTMLDivElement>(null)

  const porTalhao = useMemo(() => escolherPorTalhao(colheitas, filtro), [colheitas, filtro])
  const visiveis = filtro === 'agora' ? [...porTalhao.values()] : colheitas.filter((c) => c.safra === filtro)
  const area = visiveis.reduce((s, c) => s + c.areaHa, 0)

  function selecionar(t: Talhao) {
    setSelecionado(t)
    // No celular o painel fica abaixo do mapa.
    setTimeout(() => painelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <>
      <PageHeader
        titulo="Lavouras e colheitas"
        subtitulo={`${filtro === 'agora' ? 'Em campo agora' : `Safra ${filtro}`} · ${visiveis.length} lavoura(s) · ${fmtNumero(Math.round(area))} ha`}
        acoes={<Button icon={Plus} onClick={() => setEditando({ talhao: selecionado })}>Nova</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="radiogroup" aria-label="Filtrar por safra">
          {(['agora', ...safras] as Filtro[]).map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={filtro === s}
              onClick={() => setFiltro(s)}
              className={clsx(
                'h-8 shrink-0 rounded-md px-3 text-[13px] font-medium ring-1 ring-inset transition-colors',
                filtro === s ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50',
              )}
            >
              {s === 'agora' ? 'Em campo agora' : `Safra ${s}`}
            </button>
          ))}
        </div>
        <div className="w-48">
          <Segmentado<Visao> valor={visao} onChange={setVisao} opcoes={[{ valor: 'mapa', label: 'Mapa' }, { valor: 'lista', label: 'Lista' }]} />
        </div>
      </div>

      {isLoading ? (
        <Carregando />
      ) : error ? (
        <Erro erro={error} onTentar={refetch} />
      ) : visao === 'mapa' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <MapaFazenda
            talhoes={talhoes}
            porTalhao={porTalhao}
            dispositivos={dispositivos}
            selecionado={selecionado?.id}
            onSelecionar={selecionar}
            onDesenhoConcluido={setDesenho}
          />
          <div ref={painelRef} className="scroll-mt-20 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
            {selecionado ? (
              <PainelTalhao
                key={selecionado.id}
                t={selecionado}
                colheitas={colheitas}
                filtro={filtro}
                onNova={() => setEditando({ talhao: selecionado })}
                onConcluir={setConcluindo}
              />
            ) : (
              <Vazio icon={MapIcon} titulo="Toque em um talhão" texto="Veja a lavoura, o histórico de status e a rotação de culturas por safra." />
            )}
          </div>
        </div>
      ) : visiveis.length === 0 ? (
        <Vazio icon={Wheat} titulo="Nenhuma lavoura neste filtro" acao={<Button icon={Plus} onClick={() => setEditando({})}>Cadastrar</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((c) => (
            <ColheitaCard key={c.id} c={c} onEditar={() => setEditando({ colheita: c })} onConcluir={setConcluindo} />
          ))}
        </div>
      )}

      {filtro === 'agora' && visao === 'lista' && (
        <p className="mt-4 text-xs text-stone-500">
          Mostrando a lavoura que ocupa cada talhão hoje. <Badge>Dica</Badge> Escolha uma safra para ver as concluídas.
        </p>
      )}

      <ColheitaSheet
        aberto={!!editando}
        onFechar={() => setEditando(null)}
        colheita={editando?.colheita}
        talhaoInicial={editando?.talhao}
        talhoes={talhoes}
        produtos={produtos}
      />
      <ConcluirSheet colheita={concluindo} onFechar={() => setConcluindo(undefined)} />
      <TalhaoSheet pontos={desenho} onFechar={() => setDesenho(null)} onSalvo={() => setDesenho(null)} />
    </>
  )
}
