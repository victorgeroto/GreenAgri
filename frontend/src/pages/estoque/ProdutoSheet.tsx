import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Sheet, Textarea } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError } from '@/lib/api'
import { CATEGORIAS, UNIDADES } from '@/lib/format'
import type { Categoria, Produto, ProdutoInput, Unidade } from '@/lib/types'
import { useSalvarProduto } from './hooks'

const vazio: ProdutoInput = { sku: '', nome: '', categoria: 'GRAOS', unidade: 'SACA', estoqueMinimo: 0 }

export function ProdutoSheet({ aberto, onFechar, produto }: { aberto: boolean; onFechar: () => void; produto?: Produto }) {
  const toast = useToast()
  const salvar = useSalvarProduto(produto?.id)
  const [form, setForm] = useState<ProdutoInput>(vazio)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    if (!aberto) return
    setErros({})
    setErro(undefined)
    setForm(produto ? { ...produto, quantidadeInicial: undefined } : vazio)
  }, [aberto, produto])

  const set = <K extends keyof ProdutoInput>(k: K, v: ProdutoInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErros({})
    setErro(undefined)
    try {
      const r = await salvar.mutateAsync(form)
      toast(r.status === 'enviado' ? 'sucesso' : 'fila', r.status === 'enviado' ? 'Produto salvo' : 'Sem conexão: cadastro será enviado ao reconectar')
      onFechar()
    } catch (err) {
      if (err instanceof ApiError && err.campos) setErros(err.campos)
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo={produto ? 'Editar produto' : 'Novo produto'}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" erro={erros.sku}>
            {(id) => <Input id={id} value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} required maxLength={40} placeholder="GR-SOJA-01" />}
          </Field>
          <Field label="Categoria">
            {(id) => (
              <Select id={id} value={form.categoria} onChange={(e) => set('categoria', e.target.value as Categoria)}>
                {Object.entries(CATEGORIAS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Nome" erro={erros.nome}>
          {(id) => <Input id={id} value={form.nome} onChange={(e) => set('nome', e.target.value)} required maxLength={120} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidade">
            {(id) => (
              <Select id={id} value={form.unidade} onChange={(e) => set('unidade', e.target.value as Unidade)} disabled={!!produto}>
                {Object.entries(UNIDADES).map(([v, l]) => (
                  <option key={v} value={v}>{v === 'SACA' ? 'Saca (60 kg)' : l}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Estoque mínimo" erro={erros.estoqueMinimo}>
            {(id) => <Input id={id} type="number" min={0} step="any" inputMode="decimal" value={form.estoqueMinimo} onChange={(e) => set('estoqueMinimo', Number(e.target.value))} required />}
          </Field>
        </div>
        {!produto && (
          <Field label="Saldo inicial (opcional)" dica="Gera uma movimentação de entrada.">
            {(id) => (
              <Input id={id} type="number" min={0} step="any" inputMode="decimal" value={form.quantidadeInicial ?? ''} onChange={(e) => set('quantidadeInicial', e.target.value ? Number(e.target.value) : undefined)} />
            )}
          </Field>
        )}
        <Field label="Localização">
          {(id) => <Input id={id} value={form.localizacao ?? ''} onChange={(e) => set('localizacao', e.target.value)} placeholder="Silo 1, Galpão de insumos…" />}
        </Field>
        <Field label="Descrição">
          {(id) => <Textarea id={id} value={form.descricao ?? ''} maxLength={500} onChange={(e) => set('descricao', e.target.value)} />}
        </Field>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={salvar.isPending}>
          Salvar
        </Button>
      </form>
    </Sheet>
  )
}
