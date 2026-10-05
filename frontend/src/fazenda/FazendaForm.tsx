import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Select, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { ApiError, NetworkError } from '@/lib/api'
import type { FazendaInput } from '@/lib/types'
import { useFazenda } from './FazendaContext'
import { LocalizarFazenda } from './LocalizarFazenda'

const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']

const vazio: FazendaInput = { nome: '', municipio: '', uf: 'PR' }

/** Formulário de cadastro de fazenda; usado no diálogo e na tela de primeiro acesso. */
export function FazendaForm({ onCriada }: { onCriada?: () => void }) {
  const { criar } = useFazenda()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, setF] = useState<FazendaInput>(vazio)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  const set = <K extends keyof FazendaInput>(k: K, v: FazendaInput[K]) => setF((x) => ({ ...x, [k]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(undefined)
    setEnviando(true)
    try {
      const nova = await criar({ ...f, nome: f.nome.trim(), municipio: f.municipio.trim() })
      toast('sucesso', `${nova.nome} cadastrada e selecionada`)
      setF(vazio)
      onCriada?.()
      navigate('/') // a visão geral mostra o roteiro de primeiros passos
    } catch (err) {
      if (err instanceof NetworkError) setErro('Cadastrar uma fazenda precisa de conexão com o servidor.')
      else if (err instanceof ApiError && err.campos) setErro(Object.values(err.campos).join(' · '))
      else setErro(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nome da fazenda">
        {(id) => <Input id={id} value={f.nome} onChange={(e) => set('nome', e.target.value)} required maxLength={120} placeholder="Fazenda São José" />}
      </Field>
      <div className="grid grid-cols-[1fr_96px] gap-3">
        <Field label="Município">{(id) => <Input id={id} value={f.municipio} onChange={(e) => set('municipio', e.target.value)} required maxLength={120} />}</Field>
        <Field label="UF">
          {(id) => (
            <Select id={id} value={f.uf} onChange={(e) => set('uf', e.target.value)}>
              {UFS.map((uf) => (
                <option key={uf}>{uf}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-stone-700">Onde fica a sede</p>
        <LocalizarFazenda
          valor={f.latitude != null && f.longitude != null ? { latitude: f.latitude, longitude: f.longitude } : undefined}
          onChange={(p) => setF((x) => ({ ...x, ...p }))}
          sugestao={[f.nome, f.municipio && `${f.municipio} ${f.uf}`].filter(Boolean).join(', ')}
          alternativa={f.municipio ? `${f.municipio} ${f.uf}` : undefined}
        />
      </div>
      {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <Button type="submit" className="w-full" carregando={enviando}>
        Cadastrar fazenda
      </Button>
    </form>
  )
}

export function NovaFazendaSheet({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [chave, setChave] = useState(0)
  useEffect(() => {
    if (aberto) setChave((c) => c + 1) // formulário limpo a cada abertura
  }, [aberto])
  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Nova fazenda">
      <p className="mb-4 text-sm text-stone-600">
        Cada fazenda tem estoque, talhões, frota, equipe e sensores próprios. Você terá acesso à nova fazenda e poderá alternar entre elas pelo menu.
      </p>
      <FazendaForm key={chave} onCriada={onFechar} />
    </Sheet>
  )
}
