import { clsx } from 'clsx'
import { CheckCircle2, CloudOff, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tipo = 'sucesso' | 'fila' | 'erro'

interface Toast {
  id: number
  tipo: Tipo
  texto: string
}

const ToastContext = createContext<(tipo: Tipo, texto: string) => void>(() => {})

const icones = { sucesso: CheckCircle2, fila: CloudOff, erro: XCircle }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const mostrar = useCallback((tipo: Tipo, texto: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tipo, texto }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[1200] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const Icone = icones[t.tipo]
          return (
            <div
              key={t.id}
              className={clsx(
                'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-md bg-stone-900 px-3.5 py-2.5 text-sm text-white shadow-pop',
                { sucesso: '[&>svg]:text-brand-300', fila: '[&>svg]:text-amber-300', erro: '[&>svg]:text-red-300' }[t.tipo],
              )}
            >
              <Icone className="h-4 w-4 shrink-0" /> {t.texto}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
