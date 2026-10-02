import { clsx } from 'clsx'
import { Cloud, CloudOff, LayoutDashboard, LogOut, Package, Radio, RefreshCw, Tractor, Wheat, AlertCircle } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { useSync } from '@/offline/SyncContext'

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/colheitas', label: 'Colheitas', icon: Wheat },
  { to: '/frota', label: 'Frota', icon: Tractor },
  { to: '/campo', label: 'Campo IoT', icon: Radio },
]

function StatusSync() {
  const { online, pendentes, falhas, sincronizando } = useSync()
  const Icone = !online ? CloudOff : sincronizando ? RefreshCw : falhas > 0 ? AlertCircle : Cloud
  const texto = !online
    ? pendentes > 0 ? `Offline · ${pendentes} na fila` : 'Offline'
    : sincronizando ? 'Sincronizando…'
    : falhas > 0 ? `${falhas} com erro`
    : pendentes > 0 ? `${pendentes} na fila`
    : 'Sincronizado'
  return (
    <Link
      to="/sincronizacao"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
        !online ? 'bg-stone-800 text-white' : falhas > 0 ? 'bg-red-100 text-red-700' : pendentes > 0 ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-800',
      )}
      title="Ver fila de sincronização"
    >
      <Icone className={clsx('h-3.5 w-3.5', sincronizando && 'animate-spin')} aria-hidden />
      {texto}
    </Link>
  )
}

export function Layout() {
  const { usuario, sair, sessaoExpirada } = useAuth()
  const { pendentes } = useSync()
  const navigate = useNavigate()

  async function confirmarSaida() {
    const aviso = pendentes > 0 ? `\n\nAtenção: ${pendentes} lançamento(s) ainda não sincronizado(s) serão perdidos.` : ''
    if (confirm(`Deseja sair da conta?${aviso}`)) {
      await sair()
      navigate('/entrar')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f3] lg:flex">
      {/* Menu lateral (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200 bg-white px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <img src="/pwa-64x64.png" alt="" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-semibold text-brand-900">GreenAgri</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-200 pt-4">
          <p className="truncate px-2 text-sm font-medium text-stone-800">{usuario?.nome}</p>
          <p className="truncate px-2 text-xs text-stone-500">{usuario?.email}</p>
          <button onClick={confirmarSaida} className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-stone-600 hover:bg-stone-50">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <img src="/pwa-64x64.png" alt="" className="h-8 w-8 rounded-lg" />
              <span className="font-semibold text-brand-900">GreenAgri</span>
            </Link>
            <span className="hidden text-sm text-stone-500 lg:block">Olá, {usuario?.nome.split(' ')[0]}</span>
            <div className="flex items-center gap-2">
              <StatusSync />
              <button onClick={confirmarSaida} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 lg:hidden" aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          {sessaoExpirada && (
            <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
              Sua sessão expirou. Os lançamentos continuam guardados.{' '}
              <Link to="/entrar" className="font-semibold underline">
                Entrar novamente
              </Link>
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand-800' : 'text-stone-500')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('rounded-full px-4 py-1 transition-colors', isActive && 'bg-brand-100')}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
