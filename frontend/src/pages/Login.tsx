import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CloudOff, Radio, Wheat } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { Button, Field, Input, Segmentado } from '@/components/ui'
import { ApiError, NetworkError } from '@/lib/api'

type Modo = 'entrar' | 'registrar'

export function Login() {
  const { usuario, sessaoExpirada, entrar, registrar } = useAuth()
  const navigate = useNavigate()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState(sessaoExpirada ? (usuario?.email ?? '') : '')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  if (usuario && !sessaoExpirada) return <Navigate to="/" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(undefined)
    setEnviando(true)
    try {
      if (modo === 'entrar') await entrar(email, senha)
      else await registrar(nome, email, senha)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof NetworkError) setErro('Sem conexão. O primeiro acesso precisa de internet; depois o app funciona offline.')
      else if (err instanceof ApiError && err.campos) setErro(Object.values(err.campos).join(' · '))
      else setErro(err instanceof Error ? err.message : 'Não foi possível entrar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <img src="/img/soja.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img src="/pwa-64x64.png" alt="" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-semibold">GreenAgri</span>
          </div>
          <div className="max-w-md space-y-6">
            <h2 className="text-3xl font-semibold leading-tight">Do silo ao talhão, a fazenda inteira no seu bolso.</h2>
            <ul className="space-y-3 text-brand-100">
              <li className="flex gap-3"><Wheat className="h-5 w-5 shrink-0" /> Estoque, colheitas e frota integrados</li>
              <li className="flex gap-3"><CloudOff className="h-5 w-5 shrink-0" /> Funciona sem sinal no campo e sincroniza depois</li>
              <li className="flex gap-3"><Radio className="h-5 w-5 shrink-0" /> Sensores de solo, clima e silo em tempo real</li>
            </ul>
          </div>
          <p className="text-sm text-brand-200">Java · Spring Boot · React · PWA</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#f6f8f3] px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <img src="/pwa-192x192.png" alt="" className="h-16 w-16 rounded-2xl shadow" />
            <h1 className="text-2xl font-semibold text-brand-900">GreenAgri</h1>
          </div>
          <h2 className="mb-1 text-xl font-semibold">{modo === 'entrar' ? 'Acesse sua conta' : 'Crie sua conta'}</h2>
          <p className="mb-6 text-sm text-stone-500">
            {sessaoExpirada ? 'Sua sessão expirou. Entre novamente para sincronizar.' : 'Gestão agrícola com suporte offline.'}
          </p>

          <div className="mb-5">
            <Segmentado<Modo>
              valor={modo}
              onChange={setModo}
              opcoes={[
                { valor: 'entrar', label: 'Entrar' },
                { valor: 'registrar', label: 'Criar conta' },
              ]}
            />
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {modo === 'registrar' && (
              <Field label="Nome">{(id) => <Input id={id} value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />}</Field>
            )}
            <Field label="E-mail">
              {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />}
            </Field>
            <Field label="Senha" dica={modo === 'registrar' ? 'Mínimo de 8 caracteres' : undefined}>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={modo === 'registrar' ? 8 : undefined}
                  autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                />
              )}
            </Field>
            {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <Button type="submit" className="w-full" carregando={enviando}>
              {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {modo === 'entrar' && (
            <div className="mt-6 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
              <p className="font-medium text-stone-700">Ambiente de demonstração</p>
              <p className="mt-1">admin@greenagri.dev · greenagri123</p>
              <button
                type="button"
                className="mt-2 font-medium text-brand-700 hover:underline"
                onClick={() => {
                  setEmail('admin@greenagri.dev')
                  setSenha('greenagri123')
                }}
              >
                Preencher automaticamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
