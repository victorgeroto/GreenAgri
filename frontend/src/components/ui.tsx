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
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantes: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-card',
  secondary: 'bg-white text-stone-800 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 shadow-card',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-card',
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
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Alvo de toque maior no celular, mais compacto no desktop.
        size === 'md' ? 'h-10 text-sm sm:h-9' : 'h-9 text-[13px] sm:h-8',
        // Só ícone: botão quadrado, sem padding (senão o ícone é espremido).
        children ? (size === 'md' ? 'px-3.5' : 'px-2.5') : size === 'md' ? 'w-10 sm:w-9' : 'w-9 sm:w-8',
        variantes[variant],
        className,
      )}
      disabled={disabled || carregando}
      {...rest}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />}
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-card', className)}>{children}</div>
}

/** Bloco com cabeçalho (título + ação) separado do conteúdo por uma linha. */
export function Painel({ titulo, descricao, acao, children, className, semPadding }: {
  titulo: ReactNode
  descricao?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
  semPadding?: boolean
}) {
  return (
    <section className={clsx('min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card', className)}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-stone-900">{titulo}</h2>
          {descricao && <p className="truncate text-xs text-stone-500">{descricao}</p>}
        </div>
        {acao}
      </header>
      <div className={semPadding ? undefined : 'p-4'}>{children}</div>
    </section>
  )
}

type Tom = 'neutro' | 'verde' | 'amarelo' | 'vermelho' | 'azul'

const tons: Record<Tom, string> = {
  neutro: 'bg-stone-50 text-stone-700 ring-stone-500/20',
  verde: 'bg-brand-50 text-brand-800 ring-brand-600/20',
  amarelo: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  vermelho: 'bg-red-50 text-red-700 ring-red-600/20',
  azul: 'bg-sky-50 text-sky-800 ring-sky-600/20',
}

const pontos: Record<Tom, string> = {
  neutro: 'bg-stone-400',
  verde: 'bg-brand-500',
  amarelo: 'bg-amber-500',
  vermelho: 'bg-red-500',
  azul: 'bg-sky-500',
}

export function Badge({ tom = 'neutro', ponto, children, className }: { tom?: Tom; ponto?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', tons[tom], className)}>
      {ponto && <span className={clsx('h-1.5 w-1.5 rounded-full', pontos[tom])} aria-hidden />}
      {children}
    </span>
  )
}

export function PageHeader({ titulo, subtitulo, acoes, sobretitulo }: { titulo: string; subtitulo?: string; acoes?: ReactNode; sobretitulo?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {sobretitulo && <div className="mb-1 text-xs font-medium text-stone-500">{sobretitulo}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-[22px]">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-stone-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

/** Faixa de indicadores num único bloco, separados por divisórias. */
export function Indicadores({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-stone-200 shadow-card lg:grid-cols-4', 'gap-px', className)}>
      {children}
    </div>
  )
}

export function Indicador({ rotulo, valor, detalhe, alerta, icon: Icon, to }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; alerta?: boolean; icon?: LucideIcon; to?: string }) {
  const conteudo = (
    <>
      <p className="flex items-center gap-1.5 text-[13px] text-stone-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-stone-400" aria-hidden />}
        {rotulo}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{valor}</p>
      {detalhe && (
        <p className={clsx('mt-0.5 flex items-start gap-1 text-xs leading-snug', alerta ? 'font-medium text-amber-700' : 'text-stone-500')}>
          {alerta && <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />}
          {detalhe}
        </p>
      )}
    </>
  )
  const classe = 'block min-w-0 bg-white px-4 py-3.5'
  return to ? (
    <Link to={to} className={clsx(classe, 'transition-colors hover:bg-stone-50')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

const campoBase =
  'w-full rounded-md border-0 bg-white px-3 text-base text-stone-900 shadow-card ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:bg-stone-50 disabled:text-stone-500 sm:text-sm'

interface FieldProps {
  label: string
  erro?: string
  dica?: string
  children: (id: string) => ReactNode
}

export function Field({ label, erro, dica, children }: FieldProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-stone-700">
        {label}
      </label>
      {children(id)}
      {erro ? <p className="text-xs text-red-600">{erro}</p> : dica && <p className="text-xs text-stone-500">{dica}</p>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(campoBase, 'h-10 sm:h-9', className)} {...rest} />
})

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(campoBase, 'h-10 pr-8 sm:h-9', className)} {...rest} />
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
  // Portal no <body>: ancestrais com backdrop-filter ou sticky (cabeçalho, menu lateral)
  // virariam o contêiner do position: fixed e cortariam o diálogo.
  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal aria-label={titulo}>
      <div className="absolute inset-0 bg-stone-950/40" onClick={onFechar} />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-pop sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
          <button onClick={onFechar} className="-mr-2 rounded-md p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {texto}
    </div>
  )
}

export function Vazio({ icon: Icon, titulo, texto, acao }: { icon: LucideIcon; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <span className="rounded-md border border-stone-200 p-2 text-stone-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-stone-800">{titulo}</p>
      {texto && <p className="max-w-sm text-sm text-stone-500">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function Erro({ erro, onTentar }: { erro: unknown; onTentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500" />
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
export function Barra({ valor, max, marcador, tom = 'verde', className }: { valor: number; max: number; marcador?: number; tom?: 'verde' | 'amarelo' | 'vermelho'; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0
  const cor = { verde: 'bg-brand-600', amarelo: 'bg-amber-500', vermelho: 'bg-red-500' }[tom]
  return (
    <div className={clsx('relative h-1.5 w-full rounded-full bg-stone-100', className)}>
      <div className={clsx('h-full rounded-full transition-all', cor)} style={{ width: `${pct}%` }} />
      {marcador !== undefined && max > 0 && (
        <div className="absolute -top-0.5 h-2.5 w-px bg-stone-500" style={{ left: `${Math.min(100, (marcador / max) * 100)}%` }} />
      )}
    </div>
  )
}

export function Segmentado<T extends string>({ opcoes, valor, onChange }: { opcoes: { valor: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-grid rounded-md bg-stone-200/70 p-0.5" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(max-content, 1fr))` }} role="radiogroup">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={clsx(
            'h-9 whitespace-nowrap rounded-[5px] px-3 text-[13px] font-medium transition-colors sm:h-8',
            valor === o.valor ? 'bg-white text-stone-900 shadow-card' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Abas sublinhadas, para alternar entre visões da mesma tela. */
export function Abas<T extends string>({ opcoes, valor, onChange }: { opcoes: { valor: T; label: string; contagem?: number }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0" role="tablist">
      <div className="flex gap-5">
        {opcoes.map((o) => (
          <button
            key={o.valor}
            role="tab"
            aria-selected={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={clsx(
              '-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors',
              valor === o.valor ? 'border-brand-700 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800',
            )}
          >
            {o.label}
            {o.contagem !== undefined && (
              <span className={clsx('rounded px-1.5 text-xs tabular-nums', valor === o.valor ? 'bg-brand-50 text-brand-800' : 'bg-stone-100 text-stone-600')}>{o.contagem}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
