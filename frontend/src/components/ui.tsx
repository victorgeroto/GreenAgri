import { clsx } from 'clsx'
import { X, Loader2, AlertTriangle, type LucideIcon } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantes: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white hover:bg-brand-900 active:bg-brand-900 shadow-sm',
  secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: LucideIcon
  carregando?: boolean
}

export function Button({ variant = 'primary', size = 'md', icon: Icon, carregando, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-11 px-4 text-sm' : 'h-9 px-3 text-sm',
        variantes[variant],
        className,
      )}
      disabled={disabled || carregando}
      {...rest}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('min-w-0 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm', className)}>{children}</div>
}

type Tom = 'neutro' | 'verde' | 'amarelo' | 'vermelho' | 'azul'

const tons: Record<Tom, string> = {
  neutro: 'bg-stone-100 text-stone-700',
  verde: 'bg-brand-100 text-brand-800',
  amarelo: 'bg-amber-100 text-amber-800',
  vermelho: 'bg-red-100 text-red-700',
  azul: 'bg-sky-100 text-sky-800',
}

export function Badge({ tom = 'neutro', children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tons[tom], className)}>
      {children}
    </span>
  )
}

export function PageHeader({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-stone-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex gap-2">{acoes}</div>}
    </div>
  )
}

const campoBase =
  'w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 sm:text-sm'

interface FieldProps {
  label: string
  erro?: string
  dica?: string
  children: (id: string) => ReactNode
}

export function Field({ label, erro, dica, children }: FieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      {children(id)}
      {erro ? <p className="text-xs text-red-600">{erro}</p> : dica && <p className="text-xs text-stone-500">{dica}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(campoBase, 'h-11', className)} {...rest} />
})

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(campoBase, 'h-11', className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(campoBase, 'min-h-[80px] py-2', className)} {...rest} />
}

/** Bottom sheet no celular, diálogo centralizado em telas grandes. */
export function Sheet({ aberto, titulo, onFechar, children }: { aberto: boolean; titulo: string; onFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={titulo}>
      <div className="absolute inset-0 bg-stone-900/40" onClick={onFechar} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-stone-500">
      <Loader2 className="h-5 w-5 animate-spin" /> {texto}
    </div>
  )
}

export function Vazio({ icon: Icon, titulo, texto, acao }: { icon: LucideIcon; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-stone-400" />
      <p className="font-medium text-stone-700">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-stone-500">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function Erro({ erro, onTentar }: { erro: unknown; onTentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="h-7 w-7 text-red-500" />
      <p className="text-sm text-red-700">
        {erro instanceof Error ? erro.message : 'Não foi possível carregar os dados.'}
      </p>
      {onTentar && (
        <Button variant="secondary" size="sm" onClick={onTentar}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

/** Barra de nível; o marcador indica o limite (ex.: estoque mínimo). */
export function Barra({ valor, max, marcador, tom = 'verde' }: { valor: number; max: number; marcador?: number; tom?: 'verde' | 'amarelo' | 'vermelho' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0
  const cor = { verde: 'bg-brand-600', amarelo: 'bg-amber-500', vermelho: 'bg-red-500' }[tom]
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div className={clsx('h-full rounded-full transition-all', cor)} style={{ width: `${pct}%` }} />
      {marcador !== undefined && max > 0 && (
        <div className="absolute top-0 h-full w-0.5 bg-stone-500" style={{ left: `${Math.min(100, (marcador / max) * 100)}%` }} />
      )}
    </div>
  )
}

export function Segmentado<T extends string>({ opcoes, valor, onChange }: { opcoes: { valor: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-xl bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }} role="radiogroup">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={clsx(
            'h-9 rounded-lg text-sm font-medium transition-colors',
            valor === o.valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
