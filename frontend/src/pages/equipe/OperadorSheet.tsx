import { clsx } from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Button, Field, Input, Select, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { api, ApiError, NetworkError } from '@/lib/api'
import { FUNCOES, TIPOS_VEICULO, TURNOS } from '@/lib/format'
import type { Funcao, Operador, TipoVeiculo, Turno } from '@/lib/types'

interface Form {
  matricula: string
  nome: string
  funcao: Funcao
  turno: Turno
  cnhCategoria: string
  habilitacoes: TipoVeiculo[]
}

const vazio: Form = { matricula: '', nome: '', funcao: 'OPERADOR_MAQUINAS', turno: 'INTEGRAL', cnhCategoria: '', habilitacoes: [] }

export function OperadorSheet({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [f, setF] = useState<Form>(vazio)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setF(vazio)
      setErro(undefined)
    }
  }, [aberto])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const alternar = (t: TipoVeiculo) => set('habilitacoes', f.habilitacoes.includes(t) ? f.habilitacoes.filter((h) => h !== t) : [...f.habilitacoes, t])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(undefined)
    setEnviando(true)
    try {
      const o = await api<Operador>('/equipe/operadores', { method: 'POST', body: { ...f, cnhCategoria: f.cnhCategoria || undefined } })
      await queryClient.invalidateQueries()
      toast('sucesso', `${o.nome} entrou na equipe`)
      onFechar()
    } catch (err) {
      if (err instanceof NetworkError) setErro('Cadastrar operador precisa de conexão com o servidor.')
      else if (err instanceof ApiError && err.campos) setErro(Object.values(err.campos).join(' · '))
      else setErro(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Novo operador">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Matrícula">{(id) => <Input id={id} value={f.matricula} onChange={(e) => set('matricula', e.target.value.toUpperCase())} required maxLength={20} placeholder="OP-010" />}</Field>
          <Field label="Nome completo">{(id) => <Input id={id} value={f.nome} onChange={(e) => set('nome', e.target.value)} required maxLength={120} />}</Field>
        </div>
        <div className="grid grid-cols-[1fr_1fr_80px] gap-3">
          <Field label="Função">
            {(id) => (
              <Select id={id} value={f.funcao} onChange={(e) => set('funcao', e.target.value as Funcao)}>
                {Object.entries(FUNCOES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Turno">
            {(id) => (
              <Select id={id} value={f.turno} onChange={(e) => set('turno', e.target.value as Turno)}>
                {Object.entries(TURNOS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
          </Field>
          <Field label="CNH">{(id) => <Input id={id} value={f.cnhCategoria} onChange={(e) => set('cnhCategoria', e.target.value.toUpperCase())} maxLength={5} placeholder="AE" />}</Field>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-stone-700">Pode operar</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TIPOS_VEICULO) as TipoVeiculo[]).map((t) => {
              const marcado = f.habilitacoes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => alternar(t)}
                  className={clsx('h-8 rounded-md px-3 text-[13px] font-medium ring-1 ring-inset transition-colors', marcado ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-stone-700 ring-stone-300 hover:bg-stone-50')}
                >
                  {TIPOS_VEICULO[t]}
                </button>
              )
            })}
          </div>
          <p className="mt-1 text-xs text-stone-500">Usado para só oferecer máquinas que a pessoa pode operar.</p>
        </div>
        {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" className="w-full" carregando={enviando}>Cadastrar operador</Button>
      </form>
    </Sheet>
  )
}
