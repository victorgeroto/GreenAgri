import { clsx } from 'clsx'
import { Check, ChevronDown, ChevronsUpDown, MapPin, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import type { Fazenda } from '@/lib/types'
import { localDaFazenda, useFazenda } from './FazendaContext'
import { NovaFazendaSheet } from './FazendaForm'

function ListaFazendas({ escuro, onEscolher, onNova }: { escuro?: boolean; onEscolher: (f: Fazenda) => void; onNova: () => void }) {
  const { fazendas, atual } = useFazenda()
  return (
    <div role="listbox" aria-label="Fazendas">
      {fazendas.map((f) => {
        const ativa = f.id === atual?.id
        return (
          <button
            key={f.id}
            role="option"
            aria-selected={ativa}
            onClick={() => onEscolher(f)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
              escuro ? 'hover:bg-stone-100' : 'hover:bg-stone-50',
              ativa && 'bg-brand-50',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-stone-900">{f.nome}</span>
              <span className="block truncate text-xs text-stone-500">{localDaFazenda(f)}</span>
            </span>
            {ativa && <Check className="h-4 w-4 shrink-0 text-brand-700" aria-label="Selecionada" />}
          </button>
        )
      })}
      <div className="my-1 border-t border-stone-200" />
      <button onClick={onNova} className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm font-medium text-brand-800 hover:bg-stone-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-brand-300 text-brand-700">
          <Plus className="h-4 w-4" aria-hidden />
        </span>
        Adicionar fazenda
      </button>
    </div>
  )
}

function useTrocar() {
  const { atual, selecionar } = useFazenda()
  const navigate = useNavigate()
  const toast = useToast()
  return (f: Fazenda) => {
    if (f.id === atual?.id) return
    selecionar(f.id)
    navigate('/') // os ids da tela atual (produto, dispositivo) não existem na outra fazenda
    toast('sucesso', `Trabalhando em ${f.nome}`)
  }
}

/** Menu lateral (desktop): caixa com a fazenda atual que abre a lista. */
export function SeletorFazendaLateral() {
  const { atual } = useFazenda()
  const trocar = useTrocar()
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div ref={ref} className="relative mx-3 mt-3">
      <button
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-left ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.08]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{atual?.nome ?? 'Selecione a fazenda'}</span>
          <span className="block truncate text-xs text-white/50">{localDaFazenda(atual)}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 text-stone-900 shadow-pop">
          <ListaFazendas
            escuro
            onEscolher={(f) => {
              setAberto(false)
              trocar(f)
            }}
            onNova={() => {
              setAberto(false)
              setNova(true)
            }}
          />
        </div>
      )}
      <NovaFazendaSheet aberto={nova} onFechar={() => setNova(false)} />
    </div>
  )
}

/** Topo (celular): logo + fazenda atual; toque abre a lista. */
export function SeletorFazendaTopo() {
  const { atual } = useFazenda()
  const trocar = useTrocar()
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState(false)
  return (
    <>
      <button onClick={() => setAberto(true)} className="flex min-w-0 items-center gap-2.5 text-left" aria-label={`Fazenda: ${atual?.nome ?? 'nenhuma'}. Trocar fazenda`}>
        <Logo tamanho={28} />
        <span className="min-w-0 leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-brand-900">GreenAgri</span>
          <span className="flex items-center gap-0.5 text-[11px] text-stone-500">
            <span className="truncate">{atual?.nome ?? 'Selecione a fazenda'}</span>
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
          </span>
        </span>
      </button>
      <Sheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Trocar de fazenda">
        <ListaFazendas
          onEscolher={(f) => {
            setAberto(false)
            trocar(f)
          }}
          onNova={() => {
            setAberto(false)
            setNova(true)
          }}
        />
      </Sheet>
      <NovaFazendaSheet aberto={nova} onFechar={() => setNova(false)} />
    </>
  )
}
