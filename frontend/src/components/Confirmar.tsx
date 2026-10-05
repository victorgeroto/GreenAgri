import { clsx } from 'clsx'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui'

interface Opcoes {
  titulo: string
  mensagem?: ReactNode
  confirmar?: string
  cancelar?: string
  /** Ação destrutiva (excluir, descartar): botão vermelho. */
  perigo?: boolean
}

type Pedido = Opcoes & { responder: (ok: boolean) => void }

const ConfirmarContext = createContext<(o: Opcoes) => Promise<boolean>>(async () => false)

/** Substitui o confirm() do navegador por um diálogo no visual do app. */
export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const botaoConfirmar = useRef<HTMLButtonElement>(null)

  const confirmar = useCallback((o: Opcoes) => new Promise<boolean>((responder) => setPedido({ ...o, responder })), [])

  const fechar = useCallback(
    (ok: boolean) => {
      pedido?.responder(ok)
      setPedido(null)
    },
    [pedido],
  )

  useEffect(() => {
    if (!pedido) return
    botaoConfirmar.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar(false)
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [pedido, fechar])

  const Icone = pedido?.perigo ? AlertTriangle : HelpCircle

  return (
    <ConfirmarContext.Provider value={confirmar}>
      {children}
      {pedido &&
        createPortal(
          <div className="fixed inset-0 z-[1150] flex items-center justify-center p-4" role="alertdialog" aria-modal aria-labelledby="confirmar-titulo">
            <div className="absolute inset-0 animate-[aparecer_150ms_ease-out] bg-stone-950/40" onClick={() => fechar(false)} />
            <div className="relative w-full max-w-sm animate-[subir_180ms_ease-out] rounded-xl bg-white p-5 shadow-pop">
              <div className="flex gap-3">
                <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', pedido.perigo ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700')}>
                  <Icone className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 pt-1">
                  <h2 id="confirmar-titulo" className="text-base font-semibold text-stone-900">
                    {pedido.titulo}
                  </h2>
                  {pedido.mensagem && <div className="mt-1 text-sm text-stone-600">{pedido.mensagem}</div>}
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => fechar(false)}>
                  {pedido.cancelar ?? 'Cancelar'}
                </Button>
                <Button ref={botaoConfirmar} variant={pedido.perigo ? 'danger' : 'primary'} onClick={() => fechar(true)}>
                  {pedido.confirmar ?? 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmarContext.Provider>
  )
}

export const useConfirmar = () => useContext(ConfirmarContext)
