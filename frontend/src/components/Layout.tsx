import { clsx } from 'clsx'
import { AlertCircle, Cloud, CloudOff, LayoutDashboard, LogOut, Package, Radio, RefreshCw, Tractor, Users, Wheat, type LucideIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Logo } from '@/components/Logo'
import { Carregando } from '@/components/ui'
import { useFazenda } from '@/fazenda/FazendaContext'
import { FazendaForm } from '@/fazenda/FazendaForm'
import { SeletorFazendaLateral, SeletorFazendaTopo } from '@/fazenda/SeletorFazenda'
import { useSync } from '@/offline/SyncContext'


interface ItemNav {
  to: string
  label: string
  curto: string
  icon: LucideIcon
  end?: boolean
}

const SECOES: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/', label: 'Visão geral', curto: 'Início', icon: LayoutDashboard, end: true },
      { to: '/estoque', label: 'Estoque', curto: 'Estoque', icon: Package },
      { to: '/colheitas', label: 'Lavouras e colheitas', curto: 'Lavouras', icon: Wheat },
      { to: '/frota', label: 'Frota', curto: 'Frota', icon: Tractor },
      { to: '/equipe', label: 'Equipe de campo', curto: 'Equipe', icon: Users },
    ],
  },
  {
    titulo: 'Monitoramento',
    itens: [{ to: '/campo', label: 'Campo conectado', curto: 'Campo', icon: Radio }],
  },
]
const NAV = SECOES.flatMap((s) => s.itens)

function iniciais(nome?: string) {
  return (nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function StatusSync({ escuro }: { escuro?: boolean }) {
  const { online, pendentes, falhas, sincronizando } = useSync()
  const estado = !online ? 'offline' : sincronizando ? 'sync' : falhas > 0 ? 'falha' : pendentes > 0 ? 'fila' : 'ok'
  const Icone = { offline: CloudOff, sync: RefreshCw, falha: AlertCircle, fila: CloudOff, ok: Cloud }[estado]
  const texto = {
    offline: pendentes > 0 ? `Offline · ${pendentes} na fila` : 'Offline',
    sync: 'Sincronizando…',
    falha: `${falhas} com erro`,
    fila: `${pendentes} na fila`,
    ok: 'Sincronizado',
  }[estado]
  const ponto = { offline: 'bg-stone-400', sync: 'bg-sky-500', falha: 'bg-red-500', fila: 'bg-amber-500', ok: 'bg-brand-500' }[estado]
  return (
    <Link
      to="/sincronizacao"
      title="Ver fila de sincronização"
      className={clsx(
        'inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors',
        escuro ? 'text-white/70 hover:bg-white/5 hover:text-white' : 'text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-50',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', ponto)} aria-hidden />
      <Icone className={clsx('h-3.5 w-3.5', estado === 'sync' && 'animate-spin')} aria-hidden />
      {texto}
    </Link>
  )
}

/** Primeiro acesso de uma conta nova: ainda não há fazenda para trabalhar. */
function PrimeiraFazenda() {
  return (
    <div className="mx-auto max-w-md py-6">
      <Logo tamanho={44} className="mb-5" />
      <h1 className="text-xl font-semibold tracking-tight text-stone-900">Cadastre sua primeira fazenda</h1>
      <p className="mb-6 mt-1 text-sm text-stone-500">
        Estoque, talhões, frota, equipe e sensores ficam separados por fazenda. Depois você pode adicionar outras e alternar entre elas pelo menu.
      </p>
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <FazendaForm />
      </div>
    </div>
  )
}

export function Layout() {
  const { usuario, sair, sessaoExpirada } = useAuth()
  const { pendentes } = useSync()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const fazenda = useFazenda()
  const atual = [...NAV].reverse().find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))

  async function confirmarSaida() {
    const aviso = pendentes > 0 ? `\n\nAtenção: ${pendentes} lançamento(s) ainda não sincronizado(s) serão perdidos.` : ''
    if (confirm(`Deseja sair da conta?${aviso}`)) {
      await sair()
      navigate('/entrar')
    }
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Menu lateral (desktop) */}
      <aside className="sticky top-0 z-[1002] hidden h-screen w-60 shrink-0 flex-col bg-brand-950 text-white lg:flex">
        <Link to="/" className="flex h-14 items-center border-b border-white/10 px-4" aria-label="GreenAgri, visão geral">
          <Logo tamanho={28} comNome claro />
        </Link>

        <SeletorFazendaLateral />

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {SECOES.map((s) => (
            <div key={s.titulo} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{s.titulo}</p>
              {s.itens.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    clsx(
                      'relative mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors',
                      isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-3 h-5 w-0.5 rounded-r bg-brand-300" aria-hidden />}
                      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden /> {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold">{iniciais(usuario?.nome)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{usuario?.nome}</p>
              <p className="truncate text-xs text-white/50">{usuario?.perfil === 'ADMIN' ? 'Administrador' : 'Operador'}</p>
            </div>
            <button onClick={confirmarSaida} className="rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Sair" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[1001] border-b border-stone-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
            <div className="min-w-0 lg:hidden">
              <SeletorFazendaTopo />
            </div>
            <nav aria-label="Você está em" className="hidden items-center gap-1.5 text-sm lg:flex">
              {fazenda.atual && (
                <>
                  <span className="text-stone-500">{fazenda.atual.nome}</span>
                  <span className="text-stone-300">/</span>
                </>
              )}
              <span className="font-medium text-stone-800">{atual?.label ?? 'Sincronização'}</span>
            </nav>
            <div className="flex items-center gap-2">
              <StatusSync />
              <button onClick={confirmarSaida} className="rounded-md p-2 text-stone-500 hover:bg-stone-100 lg:hidden" aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {sessaoExpirada && (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              Sua sessão expirou. Os lançamentos continuam guardados.{' '}
              <Link to="/entrar" className="font-semibold underline">
                Entrar novamente
              </Link>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-6">
          {fazenda.carregando ? (
            <Carregando />
          ) : fazenda.fazendas.length === 0 ? (
            <PrimeiraFazenda />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-[1001] border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-6">
          {NAV.map(({ to, curto, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-brand-800' : 'text-stone-500')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand-700" aria-hidden />}
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.1 : 1.8} aria-hidden />
                  {curto}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
