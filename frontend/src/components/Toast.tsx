import { clsx } from 'clsx'
import { CheckCircle2, CloudOff, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tipo = 'sucesso' | 'fila' | 'erro'

interface Toast {
  id: number
  tipo: Tipo
  texto: string
}

const ToastContext = createContext<(tipo: Tipo, texto: string) => void>(() => {})

const ESTILO: Record<Tipo, { icone: typeof CheckCircle2; titulo: string; cor: string; barra: string }> = {
  sucesso: { icone: CheckCircle2, titulo: 'Pronto', cor: 'text-brand-600', barra: 'bg-brand-500' },
  fila: { icone: CloudOff, titulo: 'Salvo no aparelho', cor: 'text-amber-600', barra: 'bg-amber-500' },
  erro: { icone: XCircle, titulo: 'Não foi possível concluir', cor: 'text-red-600', barra: 'bg-red-500' },
}

const DURACAO_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const fechar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const mostrar = useCallback(
    (tipo: Tipo, texto: string) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-2), { id, tipo, texto }]) // no máximo 3 na tela
      setTimeout(() => fechar(id), DURACAO_MS)
    },
    [fechar],
  )

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[1200] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { icone: Icone, titulo, cor, barra } = ESTILO[t.tipo]
          return (
            <div
              key={t.id}
              role={t.tipo === 'erro' ? 'alert' : 'status'}
              className="pointer-events-auto relative w-full max-w-sm animate-[subir_200ms_ease-out] overflow-hidden rounded-lg border border-stone-200 bg-white shadow-pop"
            >
              <div className="flex items-start gap-3 py-3 pl-3.5 pr-2">
                <Icone className={clsx('mt-0.5 h-5 w-5 shrink-0', cor)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{titulo}</p>
                  <p className="text-sm text-stone-600">{t.texto}</p>
                </div>
                <button onClick={() => fechar(t.id)} className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar aviso">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Tempo restante até o aviso sumir. */}
              <span className={clsx('absolute bottom-0 left-0 h-0.5 w-full origin-left animate-[esvaziar_linear_forwards]', barra)} style={{ animationDuration: `${DURACAO_MS}ms` }} aria-hidden />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
