import { clsx } from 'clsx'
import { AlertOctagon, AlertTriangle, Bell, BellRing, CheckCheck, Info } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { fmtRelativo } from '@/lib/format'
import { suportaNotificacoes, useNotificacoes, type Gravidade } from './useNotificacoes'

const ICONE: Record<Gravidade, { icon: typeof Info; cor: string }> = {
  critico: { icon: AlertOctagon, cor: 'text-red-600 bg-red-50' },
  aviso: { icon: AlertTriangle, cor: 'text-amber-600 bg-amber-50' },
  info: { icon: Info, cor: 'text-sky-600 bg-sky-50' },
}

export function CentralNotificacoes() {
  const { todas, naoLidas, lidas, marcarLida, marcarTodas } = useNotificacoes()
  const [aberta, setAberta] = useState(false)
  const [permissao, setPermissao] = useState(() => (suportaNotificacoes() ? Notification.permission : 'denied'))
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    if (!aberta) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberta(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberta(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberta])

  async function ativarNoAparelho() {
    const r = await Notification.requestPermission()
    setPermissao(r)
    toast(r === 'granted' ? 'sucesso' : 'erro', r === 'granted' ? 'Você vai receber os alertas neste aparelho' : 'Permissão negada nas configurações do navegador')
  }

  const qtd = naoLidas.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberta((a) => !a)}
        aria-label={qtd ? `Notificações: ${qtd} não lida(s)` : 'Notificações'}
        aria-expanded={aberta}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-stone-600 ring-1 ring-inset ring-stone-200 transition-colors hover:bg-stone-50"
      >
        {qtd ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {qtd > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {qtd > 99 ? '99+' : qtd}
          </span>
        )}
      </button>

      {aberta && (
        <div className="fixed inset-x-3 top-16 z-[1150] flex max-h-[70vh] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">Notificações</p>
              <p className="text-xs text-stone-500">{qtd ? `${qtd} não lida(s)` : 'Tudo em dia'}</p>
            </div>
            {qtd > 0 && (
              <button onClick={marcarTodas} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
              </button>
            )}
          </header>

          <ul className="flex-1 divide-y divide-stone-100 overflow-y-auto">
            {todas.length === 0 && <li className="px-4 py-10 text-center text-sm text-stone-500">Nenhum aviso para esta fazenda.</li>}
            {todas.map((n) => {
              const { icon: Icone, cor } = ICONE[n.gravidade]
              const lida = lidas.includes(n.id)
              return (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      marcarLida(n.id)
                      setAberta(false)
                      navigate(n.link)
                    }}
                    className={clsx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50', !lida && 'bg-brand-50/40')}
                  >
                    <span className={clsx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', cor)}>
                      <Icone className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={clsx('block truncate text-sm', lida ? 'text-stone-600' : 'font-semibold text-stone-900')}>{n.titulo}</span>
                      <span className="line-clamp-2 block text-xs text-stone-600">{n.texto}</span>
                      {n.quando && <span className="block text-[11px] text-stone-400">{fmtRelativo(n.quando)}</span>}
                    </span>
                    {!lida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Não lida" />}
                  </button>
                </li>
              )
            })}
          </ul>

          {suportaNotificacoes() && permissao !== 'granted' && (
            <footer className="border-t border-stone-200 bg-stone-50 px-4 py-3">
              {permissao === 'denied' ? (
                <p className="text-xs text-stone-500">Avisos no aparelho bloqueados. Libere nas configurações do site no navegador.</p>
              ) : (
                <button onClick={ativarNoAparelho} className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-700 py-2 text-sm font-medium text-white hover:bg-brand-800">
                  <BellRing className="h-4 w-4" /> Avisar neste aparelho
                </button>
              )}
            </footer>
          )}
        </div>
      )}
    </div>
  )
}
