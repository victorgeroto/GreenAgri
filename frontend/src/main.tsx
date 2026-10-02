import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './components/Toast'
import { ApiError } from './lib/api'
import { SyncProvider } from './offline/SyncContext'
import './index.css'

registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // "always": a consulta roda mesmo offline para cair no cache do IndexedDB.
      networkMode: 'always',
      staleTime: 30_000,
      retry: (falhas, erro) => !(erro instanceof ApiError) && falhas < 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SyncProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
