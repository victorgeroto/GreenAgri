import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Segmentado, Select, Sheet, Textarea } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { fmtQtd, UNIDADES } from '@/lib/format'
import type { Produto, TipoMovimentacao } from '@/lib/types'
import { useMovimentar } from './hooks'

interface Props {
  aberto: boolean
  onFechar: () => void
  produtos: Produto[]
  produtoInicial?: Produto
}

/** Valor para <input type="datetime-local"> no fuso do aparelho. */
function agoraLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function MovimentarSheet({ aberto, onFechar, produtos, produtoInicial }: Props) {
  const toast = useToast()
  const movimentar = useMovimentar()
  const [produtoId, setProdutoId] = useState<number>()
  const [tipo, setTipo] = useState<TipoMovimentacao>('SAIDA')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [quando, setQuando] = useState(agoraLocal)
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (aberto) {
      setProdutoId(produtoInicial?.id)
      setQuantidade('')
      setMotivo('')
      setQuando(agoraLocal())
      setErro(undefined)
    }
  }, [aberto, produtoInicial])

  const produto = produtos.find((p) => p.id === produtoId)
  const qtd = Number(quantidade.replace(',', '.'))
  const novoSaldo = produto && qtd >= 0 ? (tipo === 'ENTRADA' ? produto.quantidadeAtual + qtd : tipo === 'SAIDA' ? produto.quantidadeAtual - qtd : qtd) : undefined
  const saldoInsuficiente = novoSaldo !== undefined && novoSaldo < 0

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!produto || saldoInsuficiente) return
    setErro(undefined)
    try {
      const r = await movimentar.mutateAsync({
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipo,
        quantidade: qtd,
        motivo: motivo.trim() || undefined,
        idCliente: crypto.randomUUID(),
        ocorridoEm: new Date(quando).toISOString(),
      })
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Movimentação registrada' : 'Sem conexão: lançamento salvo e será sincronizado')
      onFechar()
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível registrar')
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Lançar movimentação">
      <form onSubmit={enviar} className="space-y-4">
        <Segmentado<TipoMovimentacao>
          valor={tipo}
          onChange={setTipo}
          opcoes={[
            { valor: 'ENTRADA', label: 'Entrada' },
            { valor: 'SAIDA', label: 'Saída' },
            { valor: 'AJUSTE', label: 'Inventário' },
          ]}
        />
        <Field label="Produto">
          {(id) => (
            <Select id={id} value={produtoId ?? ''} onChange={(e) => setProdutoId(Number(e.target.value) || undefined)} required>
              <option value="">Selecione…</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({fmtQtd(p.quantidadeAtual, p.unidade)})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={tipo === 'AJUSTE' ? `Saldo contado${produto ? ` (${UNIDADES[produto.unidade]})` : ''}` : `Quantidade${produto ? ` (${UNIDADES[produto.unidade]})` : ''}`}
          erro={saldoInsuficiente ? `Saldo insuficiente: disponível ${fmtQtd(produto!.quantidadeAtual, produto!.unidade)}` : undefined}
          dica={produto && novoSaldo !== undefined && quantidade ? `Saldo após o lançamento: ${fmtQtd(novoSaldo, produto.unidade)}` : undefined}
        >
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="0"
              required
              autoFocus={!!produtoInicial}
            />
          )}
        </Field>
        <Field label="Data e hora" dica="Registrou depois? Ajuste para quando aconteceu.">
          {(id) => <Input id={id} type="datetime-local" value={quando} max={agoraLocal()} onChange={(e) => setQuando(e.target.value)} required />}
        </Field>
        <Field label="Motivo (opcional)">
          {(id) => <Textarea id={id} value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: venda, plantio do talhão T-03, compra NF 123" />}
        </Field>
        {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={movimentar.isPending} disabled={!produto || !quantidade || saldoInsuficiente}>
          Registrar
        </Button>
      </form>
    </Sheet>
  )
}
