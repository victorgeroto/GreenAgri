import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CloudOff, Radio, Wheat } from 'lucide-react'
import { Carrossel } from '@/components/Carrossel'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/auth/AuthContext'
import { Button, Field, Input } from '@/components/ui'
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

  const destaques = [
    { icon: Wheat, texto: 'Estoque, lavouras e frota no mesmo lugar' },
    { icon: CloudOff, texto: 'Funciona sem sinal no campo e sincroniza depois' },
    { icon: Radio, texto: 'Sensores de solo, clima, silo e máquinas em tempo real' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-white lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <Carrossel className="h-60 shrink-0 sm:h-72 lg:h-auto lg:min-h-screen">
        <Logo tamanho={34} comNome claro subtitulo="Gestão agrícola conectada" className="mb-auto" />
        <div className="hidden max-w-lg lg:block">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Do silo ao talhão, a gestão da fazenda em um só sistema.</h2>
          <ul className="mt-6 space-y-2.5 text-sm text-white/80">
            {destaques.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-brand-300" aria-hidden /> {texto}
              </li>
            ))}
          </ul>
        </div>
      </Carrossel>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
          <p className="mb-7 mt-1 text-sm text-stone-500">
            {sessaoExpirada
              ? 'Sua sessão expirou. Entre novamente para sincronizar os lançamentos guardados.'
              : modo === 'entrar'
                ? 'Acesse a gestão da sua fazenda.'
                : 'Contas novas entram com perfil de operador.'}
          </p>

          <form onSubmit={enviar} className="space-y-4">
            {modo === 'registrar' && (
              <Field label="Nome completo">{(id) => <Input id={id} value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />}</Field>
            )}
            <Field label="E-mail">
              {(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="voce@fazenda.com.br" />}
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
            {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <Button type="submit" className="w-full" carregando={enviando}>
              {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-stone-500">
            {modo === 'entrar' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button type="button" className="font-medium text-brand-700 hover:text-brand-900" onClick={() => { setModo(modo === 'entrar' ? 'registrar' : 'entrar'); setErro(undefined) }}>
              {modo === 'entrar' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>

          {modo === 'entrar' && (
            <div className="mt-8 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-3 text-xs text-stone-600">
              <p className="font-medium text-stone-800">Ambiente de demonstração</p>
              <p className="mt-0.5 font-mono">admin@greenagri.dev · greenagri123</p>
              <button
                type="button"
                className="mt-2 font-medium text-brand-700 hover:text-brand-900"
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
