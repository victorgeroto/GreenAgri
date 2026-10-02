import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Carregando } from './components/ui'
import { Login } from './pages/Login'

// Telas carregadas sob demanda; o service worker as mantém em cache para uso offline.
const Painel = lazy(() => import('./pages/Painel'))
const Estoque = lazy(() => import('./pages/estoque/Estoque'))
const ProdutoDetalhe = lazy(() => import('./pages/estoque/ProdutoDetalhe'))
const Colheitas = lazy(() => import('./pages/Colheitas'))
const Frota = lazy(() => import('./pages/Frota'))
const Campo = lazy(() => import('./pages/campo/Campo'))
const DispositivoDetalhe = lazy(() => import('./pages/campo/DispositivoDetalhe'))
const Sincronizacao = lazy(() => import('./pages/Sincronizacao'))

const ROTAS: [string, ReactNode][] = [
  ['/', <Painel />],
  ['/estoque', <Estoque />],
  ['/estoque/:id', <ProdutoDetalhe />],
  ['/colheitas', <Colheitas />],
  ['/frota', <Frota />],
  ['/campo', <Campo />],
  ['/campo/:id', <DispositivoDetalhe />],
  ['/sincronizacao', <Sincronizacao />],
]

function Protegida({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  return usuario ? children : <Navigate to="/entrar" replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        {ROTAS.map(([path, el]) => (
          <Route key={path} path={path} element={<Suspense fallback={<Carregando />}>{el}</Suspense>} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
