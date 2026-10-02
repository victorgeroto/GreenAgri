import { clsx } from 'clsx'
import { AlertTriangle, ArrowLeftRight, CloudOff, History, Package, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Barra, Button, Card, Carregando, Erro, Input, PageHeader, Segmentado, Vazio } from '@/components/ui'
import { CATEGORIAS, fmtQtd } from '@/lib/format'
import type { Categoria, Produto } from '@/lib/types'
import { useHistorico, useProdutos } from './hooks'
import { MovimentacaoItem } from './MovimentacaoItem'
import { MovimentarSheet } from './MovimentarSheet'
import { ProdutoSheet } from './ProdutoSheet'

type Aba = 'produtos' | 'historico'

export function ProdutoCard({ p, pendente, onMovimentar }: { p: Produto; pendente: boolean; onMovimentar: () => void }) {
  const escala = Math.max(p.estoqueMinimo * 3, p.quantidadeAtual, 1)
  const tom = p.abaixoDoMinimo ? 'vermelho' : p.quantidadeAtual < p.estoqueMinimo * 1.5 ? 'amarelo' : 'verde'
  return (
    <Card className="flex flex-col gap-3">
      <Link to={`/estoque/${p.id}`} className="group flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-stone-900 group-hover:text-brand-800">{p.nome}</p>
          <p className="text-xs text-stone-500">
            {p.sku} · {p.localizacao || 'Sem localização'}
          </p>
        </div>
        <Badge>{CATEGORIAS[p.categoria]}</Badge>
      </Link>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-2xl font-semibold tabular-nums">{fmtQtd(p.quantidadeAtual, p.unidade)}</span>
          <span className="text-xs text-stone-500">mín. {fmtQtd(p.estoqueMinimo, p.unidade)}</span>
        </div>
        <Barra valor={p.quantidadeAtual} max={escala} marcador={p.estoqueMinimo} tom={tom} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {p.abaixoDoMinimo && (
            <Badge tom="vermelho">
              <AlertTriangle className="h-3 w-3" /> Repor
            </Badge>
          )}
          {pendente && (
            <Badge tom="amarelo">
              <CloudOff className="h-3 w-3" /> não sincronizado
            </Badge>
          )}
        </div>
        <Button variant="secondary" size="sm" icon={ArrowLeftRight} onClick={onMovimentar}>
          Movimentar
        </Button>
      </div>
    </Card>
  )
}

export default function Estoque() {
  const { produtos, comPendencia, isLoading, error, refetch } = useProdutos()
  const historico = useHistorico()
  const [aba, setAba] = useState<Aba>('produtos')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<Categoria | 'TODAS' | 'BAIXO'>('TODAS')
  const [movimentando, setMovimentando] = useState<{ produto?: Produto } | null>(null)
  const [novo, setNovo] = useState(false)

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter(
      (p) =>
        (categoria === 'TODAS' || (categoria === 'BAIXO' ? p.abaixoDoMinimo : p.categoria === categoria)) &&
        (!termo || p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)),
    )
  }, [produtos, busca, categoria])

  const categoriasPresentes = useMemo(() => [...new Set(produtos.map((p) => p.categoria))], [produtos])
  const baixos = produtos.filter((p) => p.abaixoDoMinimo).length

  return (
    <>
      <PageHeader
        titulo="Estoque"
        subtitulo={`${produtos.length} produtos · ${baixos} abaixo do mínimo`}
        acoes={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setNovo(true)} className="hidden sm:inline-flex">
              Produto
            </Button>
            <Button icon={ArrowLeftRight} onClick={() => setMovimentando({})}>
              Lançar
            </Button>
          </>
        }
      />

      <div className="mb-4 max-w-xs">
        <Segmentado<Aba>
          valor={aba}
          onChange={setAba}
          opcoes={[
            { valor: 'produtos', label: 'Produtos' },
            { valor: 'historico', label: 'Histórico' },
          ]}
        />
      </div>

      {aba === 'produtos' ? (
        <>
          <div className="mb-3 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU" className="pl-9" aria-label="Buscar produto" />
          </div>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {(['TODAS', 'BAIXO', ...categoriasPresentes] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={clsx(
                  'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  categoria === c ? 'border-brand-800 bg-brand-800 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
                )}
              >
                {c === 'TODAS' ? 'Todos' : c === 'BAIXO' ? `Abaixo do mínimo (${baixos})` : CATEGORIAS[c]}
              </button>
            ))}
          </div>

          {isLoading ? (
            <Carregando />
          ) : error ? (
            <Erro erro={error} onTentar={refetch} />
          ) : filtrados.length === 0 ? (
            <Vazio icon={Package} titulo="Nenhum produto encontrado" texto="Ajuste a busca ou cadastre um novo produto." acao={<Button icon={Plus} onClick={() => setNovo(true)}>Novo produto</Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((p) => (
                <ProdutoCard key={p.id} p={p} pendente={comPendencia.has(p.id)} onMovimentar={() => setMovimentando({ produto: p })} />
              ))}
            </div>
          )}
        </>
      ) : historico.isLoading ? (
        <Carregando />
      ) : historico.linhas.length === 0 ? (
        <Vazio icon={History} titulo="Nenhuma movimentação ainda" />
      ) : (
        <Card className="py-1">
          <ul className="divide-y divide-stone-100">
            {historico.linhas.map((m) => (
              <MovimentacaoItem key={m.idCliente ?? m.id} m={m} />
            ))}
          </ul>
        </Card>
      )}

      {/* Botão flutuante de cadastro no celular */}
      <button
        onClick={() => setNovo(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-lg sm:hidden"
        aria-label="Novo produto"
      >
        <Plus className="h-6 w-6" />
      </button>

      <MovimentarSheet aberto={!!movimentando} onFechar={() => setMovimentando(null)} produtos={produtos} produtoInicial={movimentando?.produto} />
      <ProdutoSheet aberto={novo} onFechar={() => setNovo(false)} />
    </>
  )
}
