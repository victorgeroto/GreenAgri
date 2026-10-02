import { clsx } from 'clsx'
import { AlertTriangle, ArrowLeftRight, BellRing, ChevronRight, Package, Radio, Tractor, Wheat, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button, Card, Carregando, Erro, PageHeader } from '@/components/ui'
import { diasAte, fmtData, fmtQtd } from '@/lib/format'
import type { ResumoDashboard } from '@/lib/types'
import { useDados } from '@/offline/hooks'
import { Reconciliacao } from './campo/componentes'
import { useProdutos } from './estoque/hooks'
import { MovimentacaoItem } from './estoque/MovimentacaoItem'
import { MovimentarSheet } from './estoque/MovimentarSheet'

function Indicador({ to, icon: Icon, rotulo, valor, detalhe, alerta }: { to: string; icon: LucideIcon; rotulo: string; valor: ReactNode; detalhe: string; alerta?: boolean }) {
  return (
    <Link to={to} className="group min-w-0">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-xl bg-brand-50 p-2 text-brand-800">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-stone-500" />
        </div>
        <p className="text-sm text-stone-500">{rotulo}</p>
        <p className="text-2xl font-semibold tabular-nums">{valor}</p>
        <p className={clsx('mt-0.5 flex items-center gap-1 text-xs', alerta ? 'font-medium text-amber-700' : 'text-stone-500')}>
          {alerta && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
          {detalhe}
        </p>
      </Card>
    </Link>
  )
}

function Secao({ titulo, link, children }: { titulo: string; link: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">{titulo}</h2>
        <Link to={link} className="text-sm font-medium text-brand-700 hover:underline">
          Ver tudo
        </Link>
      </div>
      {children}
    </Card>
  )
}

export default function Painel() {
  const { usuario } = useAuth()
  const { data: r, isLoading, error, refetch } = useDados<ResumoDashboard>('/dashboard', { refetchInterval: 60_000 })
  const { produtos } = useProdutos()
  const [lancando, setLancando] = useState(false)

  if (isLoading) return <Carregando />
  if (error || !r) return <Erro erro={error} onTentar={refetch} />

  return (
    <>
      <PageHeader
        titulo={`Bom trabalho, ${usuario?.nome.split(' ')[0]}`}
        subtitulo={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        acoes={<Button icon={ArrowLeftRight} onClick={() => setLancando(true)}>Lançar no estoque</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador to="/estoque" icon={Package} rotulo="Produtos" valor={r.produtos} detalhe={r.estoqueBaixo.length ? `${r.estoqueBaixo.length} abaixo do mínimo` : 'Estoque em dia'} alerta={r.estoqueBaixo.length > 0} />
        <Indicador to="/colheitas" icon={Wheat} rotulo="Colheitas em aberto" valor={r.colheitasAbertas} detalhe={r.proximasColheitas[0] ? `próxima: ${r.proximasColheitas[0].cultura} em ${fmtData(r.proximasColheitas[0].previsaoColheita)}` : 'Nenhuma prevista'} />
        <Indicador to="/frota" icon={Tractor} rotulo="Máquinas na oficina" valor={r.veiculosEmManutencao} detalhe={`${r.manutencoesPendentes} revisão(ões) em até 7 dias`} alerta={r.manutencoesPendentes > 0} />
        <Indicador to="/campo" icon={Radio} rotulo="Sensores online" valor={`${r.dispositivosOnline}/${r.dispositivos}`} detalhe={r.alertasIotAbertos ? `${r.alertasIotAbertos} alerta(s) em aberto` : 'Sem alertas'} alerta={r.alertasIotAbertos > 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Repor estoque" link="/estoque">
          {r.estoqueBaixo.length === 0 ? (
            <p className="py-4 text-sm text-stone-500">Todos os produtos acima do mínimo.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {r.estoqueBaixo.map((p) => (
                <li key={p.id}>
                  <Link to={`/estoque/${p.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:text-brand-800">
                    <span className="truncate text-sm">{p.nome}</span>
                    <span className="shrink-0 text-sm tabular-nums">
                      <strong className="text-red-600">{fmtQtd(p.quantidadeAtual, p.unidade)}</strong>
                      <span className="text-stone-400"> / mín. {fmtQtd(p.estoqueMinimo, p.unidade)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao titulo="Silos monitorados" link="/campo">
          {r.silos.length === 0 ? (
            <p className="py-4 text-sm text-stone-500">Nenhum silo com sensor de nível.</p>
          ) : (
            <div className="space-y-3">
              {r.silos.map((d) => d.silo && <Reconciliacao key={d.id} r={d.silo} />)}
            </div>
          )}
        </Secao>

        <Secao titulo="Próximas colheitas" link="/colheitas">
          <ul className="divide-y divide-stone-100">
            {r.proximasColheitas.map((c) => {
              const dias = diasAte(c.previsaoColheita)
              return (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <strong>{c.cultura}</strong> <span className="text-stone-500">· talhão {c.talhao}</span>
                  </span>
                  <span className={dias <= 7 ? 'font-medium text-amber-700' : 'text-stone-500'}>
                    {dias <= 0 ? 'hoje' : `em ${dias} dias`}
                  </span>
                </li>
              )
            })}
          </ul>
        </Secao>

        <Secao titulo="Últimas movimentações" link="/estoque">
          <ul className="divide-y divide-stone-100">
            {r.ultimasMovimentacoes.map((m) => (
              <MovimentacaoItem key={m.id} m={m} />
            ))}
          </ul>
        </Secao>
      </div>

      {r.alertasIotAbertos > 0 && (
        <Link to="/campo" className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <BellRing className="h-5 w-5 shrink-0" />
          {r.alertasIotAbertos} alerta(s) dos sensores de campo aguardando avaliação
          <ChevronRight className="ml-auto h-4 w-4" />
        </Link>
      )}

      <MovimentarSheet aberto={lancando} onFechar={() => setLancando(false)} produtos={produtos} />
    </>
  )
}
