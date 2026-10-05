import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export interface Foto {
  src: string
  titulo: string
  legenda: string
}

/** Fotos de campo da fazenda (public/img/campo), pré-carregadas pelo service worker para uso offline. */
export const FOTOS_CAMPO: Foto[] = [
  { src: '/img/campo/plantio-direto.jpg', titulo: 'Plantio direto', legenda: 'Trator com plantadeira de precisão em operação sobre a palhada.' },
  { src: '/img/campo/lavoura-emergencia.jpg', titulo: 'Lavoura em emergência', legenda: 'Plantas nas primeiras semanas, com linhas uniformes e boa cobertura do solo.' },
  { src: '/img/campo/preparo-palhada.jpg', titulo: 'Semeadura em escala', legenda: 'Linhas de plantio sobre a palhada da cultura anterior.' },
  { src: '/img/campo/adubacao-lanco.jpg', titulo: 'Adubação a lanço', legenda: 'Distribuição de fertilizante após a colheita, preparando a próxima safra.' },
]

/** Login: painel alto (≈770×900), então só as fotos com resolução para esse recorte. */
export const FOTOS_LOGIN: Foto[] = FOTOS_CAMPO.filter((f) => /lavoura-emergencia|preparo-palhada/.test(f.src))

const INTERVALO_MS = 6000

interface Props {
  fotos?: Foto[]
  className?: string
  /** Conteúdo sobreposto (ex.: indicadores da safra); a legenda da foto fica abaixo dele. */
  children?: ReactNode
  /** Esconde título/legenda da foto (útil como fundo). */
  semLegenda?: boolean
}

export function Carrossel({ fotos = FOTOS_CAMPO, className, children, semLegenda }: Props) {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [hover, setHover] = useState(false)
  const reduzirMovimento = useRef(typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const toque = useRef<number | null>(null)

  const ir = useCallback((i: number) => setAtual((i + fotos.length) % fotos.length), [fotos.length])

  useEffect(() => {
    if (pausado || hover || reduzirMovimento.current || fotos.length < 2) return
    const t = setTimeout(() => ir(atual + 1), INTERVALO_MS)
    return () => clearTimeout(t)
  }, [atual, pausado, hover, ir, fotos.length])

  const foto = fotos[atual]

  return (
    <section
      className={clsx('relative isolate overflow-hidden bg-stone-900', className)}
      aria-roledescription="carrossel"
      aria-label="Fotos do campo"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPointerDown={(e) => (toque.current = e.clientX)}
      onPointerUp={(e) => {
        if (toque.current === null) return
        const dx = e.clientX - toque.current
        toque.current = null
        if (Math.abs(dx) > 40) ir(atual + (dx < 0 ? 1 : -1))
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') ir(atual + 1)
        if (e.key === 'ArrowLeft') ir(atual - 1)
      }}
    >
      {fotos.map((f, i) => (
        <img
          key={f.src}
          src={f.src}
          alt={i === atual ? `${f.titulo}: ${f.legenda}` : ''}
          aria-hidden={i !== atual}
          draggable={false}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={clsx(
            'absolute inset-0 h-full w-full select-none object-cover transition-[opacity,transform] duration-[1200ms] ease-out',
            i === atual ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0',
          )}
        />
      ))}
      {/* Escurece a base para o texto ter contraste sobre qualquer foto. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" aria-hidden />

      <div className="relative flex h-full flex-col justify-end p-4 text-white sm:p-6">
        {children}
        <div className="mt-4 flex items-end justify-between gap-4">
          {!semLegenda ? (
            <div className="min-w-0" aria-live="polite">
              <p className="text-sm font-semibold">{foto.titulo}</p>
              <p className="line-clamp-2 max-w-xl text-xs text-white/75 sm:text-[13px]">{foto.legenda}</p>
            </div>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-1">
            <div className="mr-2 hidden items-center gap-1.5 sm:flex">
              {fotos.map((f, i) => (
                <button
                  key={f.src}
                  onClick={() => ir(i)}
                  aria-label={`Foto ${i + 1}: ${f.titulo}`}
                  aria-current={i === atual}
                  className="group flex h-6 items-center"
                >
                  <span className={clsx('block h-1 rounded-full transition-all', i === atual ? 'w-6 bg-white' : 'w-3 bg-white/40 group-hover:bg-white/70')} />
                </button>
              ))}
            </div>
            <ControleCarrossel rotulo="Foto anterior" onClick={() => ir(atual - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </ControleCarrossel>
            <ControleCarrossel rotulo={pausado ? 'Retomar' : 'Pausar'} onClick={() => setPausado((p) => !p)}>
              {pausado ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </ControleCarrossel>
            <ControleCarrossel rotulo="Próxima foto" onClick={() => ir(atual + 1)}>
              <ChevronRight className="h-4 w-4" />
            </ControleCarrossel>
          </div>
        </div>
      </div>
      <span className="sr-only">
        Foto {atual + 1} de {fotos.length}
      </span>
    </section>
  )
}

function ControleCarrossel({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/20"
    >
      {children}
    </button>
  )
}
