import { clsx } from 'clsx'
import { ArrowLeftRight, ArrowRight, BellRing, ChevronRight, Droplets, Package, Radio, Thermometer, Tractor, Wheat } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Carrossel } from '@/components/Carrossel'
import { ImagemProduto } from '@/components/ImagemProduto'
import { FAZENDA } from '@/components/Layout'
import { Badge, Button, Carregando, Erro, Indicador, Indicadores, PageHeader, Painel as Bloco } from '@/components/ui'
import { diasAte, fmtData, fmtNumero, fmtQtd, fmtRelativo, hojeISO, safraDe, STATUS_COLHEITA } from '@/lib/format'
import type { Colheita, Dispositivo, Operador, ResumoDashboard } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { Reconciliacao } from './campo/componentes'
import { Avatar, resumoAtividade } from './equipe/componentes'
import { useProdutos } from './estoque/hooks'
import { MovimentacaoItem } from './estoque/MovimentacaoItem'
import { MovimentarSheet } from './estoque/MovimentarSheet'

function VerTudo({ to, children = 'Ver tudo' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-900">
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

/** Dado sobreposto às fotos do campo. */
function DadoHero({ rotulo, valor, icon: Icon }: { rotulo: string; valor: ReactNode; icon?: typeof Thermometer }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-white/60">
        {Icon && <Icon className="h-3 w-3" aria-hidden />} {rotulo}
      </p>
      <p className="truncate text-lg font-semibold tabular-nums sm:text-xl">{valor}</p>
    </div>
  )
}

export default function Painel() {
  const { usuario } = useAuth()
  const { data: r, isLoading, error, refetch } = useDados<ResumoDashboard>('/dashboard', { refetchInterval: 60_000 })
  const { data: dispositivos = [] } = useDados<Dispositivo[]>('/iot/dispositivos', { refetchInterval: 60_000 })
  const { data: colheitas = [] } = useDados<Colheita[]>('/colheitas')
  const { data: equipe = [] } = useDados<Operador[]>('/equipe/operadores', { refetchInterval: 60_000 })
  const { produtos } = useProdutos()
  const [lancando, setLancando] = useState(false)

  if (isLoading) return <Carregando />
  if (error || !r) return <Erro erro={error} onTentar={refetch} />

  const estacao = dispositivos.find((d) => d.tipo === 'ESTACAO_METEOROLOGICA')
  const emCampo = colheitas.filter((c) => c.status === 'EM_DESENVOLVIMENTO' || c.status === 'EM_COLHEITA')
  const areaEmCampo = emCampo.reduce((s, c) => s + c.areaHa, 0)
  const colhendo = colheitas.filter((c) => c.status === 'EM_COLHEITA')
  // Safra corrente = a das lavouras em campo (em out/2026 o trigo ainda é da 2025/26).
  const safraAtual = emCampo.map((c) => c.safra).sort()[0] ?? safraDe(hojeISO())

  return (
    <>
      <PageHeader
        sobretitulo={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        titulo="Visão geral"
        subtitulo={`Olá, ${usuario?.nome.split(' ')[0]}. Resumo da operação de hoje.`}
        acoes={<Button icon={ArrowLeftRight} onClick={() => setLancando(true)}>Lançar no estoque</Button>}
      />

      <Carrossel className="mb-5 h-[400px] rounded-lg sm:h-[340px]">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-white/70">
            {FAZENDA.nome} · {FAZENDA.local}
          </p>
          <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">Safra {safraAtual}</p>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-3 sm:grid-cols-4">
            <DadoHero rotulo="Em campo" valor={`${fmtNumero(Math.round(areaEmCampo))} ha`} />
            <DadoHero rotulo="Colhendo agora" valor={colhendo.length ? colhendo.map((c) => c.talhao).join(', ') : 'Nenhum talhão'} />
            <DadoHero rotulo="Temperatura" icon={Thermometer} valor={estacao?.ultimaLeitura?.temperatura != null ? `${fmtNumero(estacao.ultimaLeitura.temperatura)} °C` : '—'} />
            <DadoHero rotulo="Umidade do ar" icon={Droplets} valor={estacao?.ultimaLeitura?.umidadeAr != null ? `${fmtNumero(Math.round(estacao.ultimaLeitura.umidadeAr))}%` : '—'} />
          </div>
          {estacao && <p className="mt-2 text-[11px] text-white/55">Estação {estacao.codigo} · atualizado {fmtRelativo(estacao.ultimoContato)}</p>}
        </div>
      </Carrossel>

      <Indicadores className="mb-5">
          <Indicador to="/estoque" icon={Package} rotulo="Produtos em estoque" valor={r.produtos} detalhe={r.estoqueBaixo.length ? `${r.estoqueBaixo.length} abaixo do mínimo` : 'Todos acima do mínimo'} alerta={r.estoqueBaixo.length > 0} />
        <Indicador
          to="/colheitas"
          icon={Wheat}
          rotulo="Lavouras em aberto"
          valor={r.colheitasAbertas}
          detalhe={r.proximasColheitas[0] ? `Próxima: ${r.proximasColheitas[0].cultura}, ${fmtData(r.proximasColheitas[0].previsaoColheita)}` : 'Nenhuma prevista'}
        />
        <Indicador to="/frota" icon={Tractor} rotulo="Máquinas na oficina" valor={r.veiculosEmManutencao} detalhe={`${r.manutencoesPendentes} revisão(ões) em até 7 dias`} alerta={r.manutencoesPendentes > 0} />
        <Indicador
          to="/campo"
          icon={Radio}
          rotulo="Dispositivos online"
          valor={
            <>
              {r.dispositivosOnline}
              <span className="text-base font-normal text-stone-400"> / {r.dispositivos}</span>
            </>
          }
          detalhe={r.alertasIotAbertos ? `${r.alertasIotAbertos} alerta(s) em aberto` : 'Sem alertas'}
          alerta={r.alertasIotAbertos > 0}
        />
      </Indicadores>

      {r.alertasIotAbertos > 0 && (
        <Link to="/campo" className="mb-5 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100/70">
          <BellRing className="h-4 w-4 shrink-0" />
          <span>
            <strong className="font-semibold">{r.alertasIotAbertos} alerta(s)</strong> dos sensores de campo aguardando avaliação
          </span>
          <ChevronRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <Bloco className="lg:col-span-2" titulo="Últimas movimentações de estoque" descricao={`${r.movimentacoes30d} lançamentos nos últimos 30 dias`} acao={<VerTudo to="/estoque" />} semPadding>
          <ul className="divide-y divide-stone-100 px-4">
            {r.ultimasMovimentacoes.map((m) => (
              <MovimentacaoItem key={m.id} m={m} />
            ))}
          </ul>
        </Bloco>

        <Bloco titulo="Repor estoque" descricao="Abaixo do estoque mínimo" acao={<VerTudo to="/estoque" />} semPadding>
          {r.estoqueBaixo.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">Todos os produtos acima do mínimo.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {r.estoqueBaixo.map((p) => (
                <li key={p.id}>
                  <Link to={`/estoque/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50">
                    <ImagemProduto produto={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-800">{p.nome}</span>
                      <span className="block text-xs tabular-nums text-stone-500">mínimo {fmtQtd(p.estoqueMinimo, p.unidade)}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-red-700">{fmtQtd(p.quantidadeAtual, p.unidade)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco className="lg:col-span-2" titulo="Silos monitorados" descricao="Nível medido pelo sensor comparado ao saldo lançado" acao={<VerTudo to="/campo" />}>
          {r.silos.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhum silo com sensor de nível.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">{r.silos.map((d) => d.silo && <Reconciliacao key={d.id} r={d.silo} />)}</div>
          )}
        </Bloco>

        <Bloco titulo="Próximas colheitas" acao={<VerTudo to="/colheitas" />} semPadding>
          <ul className="divide-y divide-stone-100">
            {r.proximasColheitas.map((c) => {
              const dias = diasAte(c.previsaoColheita)
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-800">{c.cultura}</p>
                    <p className="text-xs text-stone-500">
                      Talhão {c.talhao} · {STATUS_COLHEITA[c.status]}
                    </p>
                  </div>
                  <Badge tom={dias <= 7 ? 'amarelo' : 'neutro'}>{dias <= 0 ? 'Hoje' : `${dias} dias`}</Badge>
                </li>
              )
            })}
          </ul>
        </Bloco>

        <Bloco
          className="lg:col-span-3"
          titulo="Equipe hoje"
          descricao={`${r.operadoresDisponiveis} disponíveis · ${r.operadoresEmAtividade} em atividade · ${r.operadores - r.operadoresDisponiveis - r.operadoresEmAtividade} ausentes`}
          acao={<VerTudo to="/equipe">Alocar equipe</VerTudo>}
          semPadding
        >
          <ul className="grid divide-y divide-stone-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {equipe.filter((o) => o.alocacaoAtual).map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar nome={o.nome} situacao={o.situacao} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-800">{o.nome}</p>
                  <p className="truncate text-xs text-stone-500">{resumoAtividade(o.alocacaoAtual!)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      <p className={clsx('mt-6 text-center text-xs text-stone-400')}>
        Dados de demonstração · {FAZENDA.nome}
      </p>

      <MovimentarSheet aberto={lancando} onFechar={() => setLancando(false)} produtos={produtos} />
    </>
  )
}
