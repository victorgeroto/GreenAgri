import { clsx } from 'clsx'
import { ArrowLeftRight, CloudOff, History, Package, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ImagemProduto } from '@/components/ImagemProduto'
import { Abas, Badge, Barra, Button, Carregando, Erro, Input, PageHeader, Select, Vazio } from '@/components/ui'
import { CATEGORIAS, fmtQtd } from '@/lib/format'
import type { Categoria, Produto } from '@/lib/types'
import { useHistorico, useProdutos } from './hooks'
import { MovimentacaoItem } from './MovimentacaoItem'
import { MovimentarSheet } from './MovimentarSheet'
import { ProdutoSheet } from './ProdutoSheet'

type Aba = 'produtos' | 'historico'
type Filtro = Categoria | 'TODAS' | 'BAIXO'

function situacao(p: Produto) {
  if (p.abaixoDoMinimo) return { tom: 'vermelho' as const, barra: 'vermelho' as const, texto: 'Repor' }
  if (p.quantidadeAtual < p.estoqueMinimo * 1.5) return { tom: 'amarelo' as const, barra: 'amarelo' as const, texto: 'Atenção' }
  return { tom: 'verde' as const, barra: 'verde' as const, texto: 'Normal' }
}

function Saldo({ p }: { p: Produto }) {
  const s = situacao(p)
  return (
    <div className="w-full min-w-[120px]">
      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-stone-900">{fmtQtd(p.quantidadeAtual, p.unidade)}</p>
      <Barra className="mt-1.5" valor={p.quantidadeAtual} max={Math.max(p.estoqueMinimo * 3, p.quantidadeAtual, 1)} marcador={p.estoqueMinimo} tom={s.barra} />
    </div>
  )
}

function SeloPendente() {
  return (
    <Badge tom="amarelo">
      <CloudOff className="h-3 w-3" /> Na fila
    </Badge>
  )
}

function TabelaProdutos({ produtos, pendentes, onMovimentar }: { produtos: Produto[]; pendentes: Set<number>; onMovimentar: (p: Produto) => void }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-stone-200 bg-stone-50/80 text-left text-xs font-medium text-stone-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Produto</th>
            <th className="px-3 py-2.5 font-medium">Categoria</th>
            <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Local</th>
            <th className="w-48 px-3 py-2.5 font-medium">Saldo</th>
            <th className="px-3 py-2.5 text-right font-medium">Mínimo</th>
            <th className="px-3 py-2.5 font-medium">Situação</th>
            <th className="w-px px-4 py-2.5" aria-label="Ações" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {produtos.map((p) => {
            const s = situacao(p)
            return (
              <tr key={p.id} className="cursor-pointer hover:bg-stone-50/70" onClick={() => navigate(`/estoque/${p.id}`)}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <ImagemProduto produto={p} tamanho="md" />
                    <div className="min-w-0">
                      <Link to={`/estoque/${p.id}`} className="block truncate font-medium text-stone-900 hover:text-brand-800" onClick={(e) => e.stopPropagation()}>
                        {p.nome}
                      </Link>
                      <p className="font-mono text-xs text-stone-500">{p.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-stone-600">{CATEGORIAS[p.categoria]}</td>
                <td className="hidden max-w-[180px] truncate px-3 py-2.5 text-stone-600 xl:table-cell">{p.localizacao || '—'}</td>
                <td className="px-3 py-2.5">
                  <Saldo p={p} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-stone-600">{fmtQtd(p.estoqueMinimo, p.unidade)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    <Badge tom={s.tom} ponto>
                      {s.texto}
                    </Badge>
                    {pendentes.has(p.id) && <SeloPendente />}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ArrowLeftRight}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMovimentar(p)
                    }}
                  >
                    Movimentar
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ListaProdutos({ produtos, pendentes, onMovimentar }: { produtos: Produto[]; pendentes: Set<number>; onMovimentar: (p: Produto) => void }) {
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
      {produtos.map((p) => {
        const s = situacao(p)
        return (
          <li key={p.id} className="flex items-center gap-3 px-3 py-3">
            <Link to={`/estoque/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <ImagemProduto produto={p} tamanho="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-900">{p.nome}</p>
                <p className="truncate text-xs text-stone-500">
                  {CATEGORIAS[p.categoria]} · {p.localizacao || 'Sem local'}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{fmtQtd(p.quantidadeAtual, p.unidade)}</span>
                  {s.tom !== 'verde' && (
                    <Badge tom={s.tom} ponto>
                      {s.texto}
                    </Badge>
                  )}
                  {pendentes.has(p.id) && <SeloPendente />}
                </div>
              </div>
            </Link>
            <Button variant="secondary" size="sm" icon={ArrowLeftRight} onClick={() => onMovimentar(p)} aria-label={`Movimentar ${p.nome}`} />
          </li>
        )
      })}
    </ul>
  )
}

export default function Estoque() {
  const { produtos, comPendencia, isLoading, error, refetch } = useProdutos()
  const historico = useHistorico()
  const [aba, setAba] = useState<Aba>('produtos')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('TODAS')
  const [movimentando, setMovimentando] = useState<{ produto?: Produto } | null>(null)
  const [novo, setNovo] = useState(false)

  // Atalho do roteiro de primeiros passos: ?novo=1 abre o cadastro.
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    if (params.get('novo') === '1') {
      setNovo(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter(
      (p) =>
        (filtro === 'TODAS' || (filtro === 'BAIXO' ? p.abaixoDoMinimo : p.categoria === filtro)) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)),
    )
  }, [produtos, busca, filtro])

  const categoriasPresentes = useMemo(() => [...new Set(produtos.map((p) => p.categoria))], [produtos])
  const baixos = produtos.filter((p) => p.abaixoDoMinimo).length

  return (
    <>
      <PageHeader
        titulo="Estoque"
        subtitulo="Saldos calculados a partir das movimentações de entrada, saída e inventário."
        acoes={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setNovo(true)}>
              Novo produto
            </Button>
            <Button icon={ArrowLeftRight} onClick={() => setMovimentando({})}>
              Lançar movimentação
            </Button>
          </>
        }
      />

      <Abas<Aba>
        valor={aba}
        onChange={setAba}
        opcoes={[
          { valor: 'produtos', label: 'Produtos', contagem: produtos.length },
          { valor: 'historico', label: 'Histórico de movimentações' },
        ]}
      />

      {aba === 'produtos' ? (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU" className="pl-9" aria-label="Buscar produto" />
            </div>
            <Select value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} className="sm:w-56" aria-label="Filtrar por categoria">
              <option value="TODAS">Todas as categorias</option>
              <option value="BAIXO">Abaixo do mínimo ({baixos})</option>
              {categoriasPresentes.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS[c]}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <Carregando />
          ) : error ? (
            <Erro erro={error} onTentar={refetch} />
          ) : filtrados.length === 0 ? (
            <Vazio icon={Package} titulo="Nenhum produto encontrado" texto="Ajuste a busca ou cadastre um novo produto." acao={<Button icon={Plus} onClick={() => setNovo(true)}>Novo produto</Button>} />
          ) : (
            <>
              <div className="hidden md:block">
                <TabelaProdutos produtos={filtrados} pendentes={comPendencia} onMovimentar={(p) => setMovimentando({ produto: p })} />
              </div>
              <div className="md:hidden">
                <ListaProdutos produtos={filtrados} pendentes={comPendencia} onMovimentar={(p) => setMovimentando({ produto: p })} />
              </div>
              <p className={clsx('mt-2 text-xs text-stone-500')}>
                {filtrados.length} de {produtos.length} produtos · {baixos} abaixo do mínimo
              </p>
            </>
          )}
        </>
      ) : historico.isLoading ? (
        <Carregando />
      ) : historico.linhas.length === 0 ? (
        <Vazio icon={History} titulo="Nenhuma movimentação ainda" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white px-4 shadow-card">
          <ul className="divide-y divide-stone-100">
            {historico.linhas.map((m) => (
              <MovimentacaoItem key={m.idCliente ?? m.id} m={m} />
            ))}
          </ul>
        </div>
      )}

      <MovimentarSheet aberto={!!movimentando} onFechar={() => setMovimentando(null)} produtos={produtos} produtoInicial={movimentando?.produto} />
      <ProdutoSheet aberto={novo} onFechar={() => setNovo(false)} />
    </>
  )
}
