import { ArrowLeft, ArrowLeftRight, History, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthContext'
import { ImagemProduto } from '@/components/ImagemProduto'
import { Badge, Barra, Button, Card, Carregando, Painel, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api } from '@/lib/api'
import { CATEGORIAS, fmtDataHora, fmtQtd } from '@/lib/format'
import { useSync } from '@/offline/SyncContext'
import { useHistorico, useProdutos } from './hooks'
import { MovimentacaoItem } from './MovimentacaoItem'
import { MovimentarSheet } from './MovimentarSheet'
import { ProdutoSheet } from './ProdutoSheet'

export default function ProdutoDetalhe() {
  const id = Number(useParams().id)
  const { produtos, isLoading } = useProdutos()
  const historico = useHistorico(id)
  const { usuario } = useAuth()
  const { online } = useSync()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [movimentando, setMovimentando] = useState(false)
  const [editando, setEditando] = useState(false)

  const p = produtos.find((x) => x.id === id)
  if (isLoading) return <Carregando />
  if (!p) return <Vazio icon={History} titulo="Produto não encontrado" acao={<Link to="/estoque" className="text-brand-700">Voltar ao estoque</Link>} />

  async function excluir() {
    if (!p || !confirm(`Excluir "${p.nome}" e todo o seu histórico?`)) return
    try {
      await api(`/produtos/${p.id}`, { method: 'DELETE' })
      await queryClient.invalidateQueries()
      toast('sucesso', 'Produto excluído')
      navigate('/estoque')
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  return (
    <>
      <Link to="/estoque" className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> Estoque
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-1">
          <ImagemProduto key={p.imagem ?? 'sem'} produto={p} tamanho="lg" />
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge>{CATEGORIAS[p.categoria]}</Badge>
              {p.abaixoDoMinimo && <Badge tom="vermelho">Abaixo do mínimo</Badge>}
            </div>
            <h1 className="text-xl font-semibold">{p.nome}</h1>
            <p className="text-sm text-stone-500">{p.sku}</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">{fmtQtd(p.quantidadeAtual, p.unidade)}</p>
            <div className="mt-2">
              <Barra valor={p.quantidadeAtual} max={Math.max(p.estoqueMinimo * 3, p.quantidadeAtual, 1)} marcador={p.estoqueMinimo} tom={p.abaixoDoMinimo ? 'vermelho' : 'verde'} />
            </div>
            <p className="mt-1 text-xs text-stone-500">Estoque mínimo: {fmtQtd(p.estoqueMinimo, p.unidade)}</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Localização</dt><dd className="text-right">{p.localizacao || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-500">Atualizado</dt><dd>{fmtDataHora(p.atualizadoEm)}</dd></div>
          </dl>
          {p.descricao && <p className="text-sm text-stone-600">{p.descricao}</p>}
          <div className="flex flex-wrap gap-2">
            <Button icon={ArrowLeftRight} onClick={() => setMovimentando(true)} className="flex-1">Movimentar</Button>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditando(true)} aria-label="Editar" />
            {usuario?.perfil === 'ADMIN' && (
              <Button variant="secondary" icon={Trash2} onClick={excluir} disabled={!online} title={online ? 'Excluir' : 'Disponível apenas online'} aria-label="Excluir" />
            )}
          </div>
        </Card>

        <Painel className="self-start lg:col-span-2" titulo="Histórico de movimentações" descricao="Cada linha mostra o saldo resultante após o lançamento">
          {historico.isLoading ? (
            <Carregando />
          ) : historico.linhas.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Nenhuma movimentação.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {historico.linhas.map((m) => (
                <MovimentacaoItem key={m.idCliente ?? m.id} m={m} mostrarProduto={false} />
              ))}
            </ul>
          )}
        </Painel>
      </div>

      <MovimentarSheet aberto={movimentando} onFechar={() => setMovimentando(false)} produtos={produtos} produtoInicial={p} />
      <ProdutoSheet aberto={editando} onFechar={() => setEditando(false)} produto={p} />
    </>
  )
}
