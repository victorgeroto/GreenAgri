import { clsx } from 'clsx'

/** Marca GreenAgri: o "G" com a folha como travessão. Mesmo desenho de public/icon.svg. */
export function Logo({ tamanho = 28, comNome, subtitulo, claro, className }: {
  tamanho?: number
  comNome?: boolean
  subtitulo?: string
  /** Texto branco, para fundos escuros ou fotos. */
  claro?: boolean
  className?: string
}) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 512 512" width={tamanho} height={tamanho} aria-hidden={comNome} role={comNome ? undefined : 'img'} aria-label={comNome ? undefined : 'GreenAgri'} className={clsx('shrink-0', claro && 'drop-shadow-sm')}>
        <rect width="512" height="512" rx="116" fill="#235737" />
        {claro && <rect x="8" y="8" width="496" height="496" rx="110" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="16" />}
        <path d="M362 160 A144 144 0 1 0 400 262" fill="none" stroke="#ffffff" strokeWidth="58" />
        <path d="M429 262 C 392 196, 300 186, 230 238 C 296 290, 384 304, 429 262 Z" fill="#a7d7b3" />
        <path d="M414 260 C 360 238, 296 232, 252 240" fill="none" stroke="#235737" strokeWidth="11" strokeLinecap="round" />
      </svg>
      {comNome && (
        <span className="leading-tight">
          <span className={clsx('block font-semibold tracking-tight', claro ? 'text-white' : 'text-brand-900')} style={{ fontSize: Math.max(14, tamanho * 0.52) }}>
            GreenAgri
          </span>
          {subtitulo && <span className={clsx('block text-[11px] font-normal', claro ? 'text-white/55' : 'text-stone-500')}>{subtitulo}</span>}
        </span>
      )}
    </span>
  )
}
