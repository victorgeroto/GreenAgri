import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock, KeyRound, LogOut, Mail, MapPin, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useConfirmar } from '@/components/Confirmar'
import { useToast } from '@/components/Toast'
import { Badge, Button, Carregando, Erro, Field, Input, PageHeader, Painel } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { fmtData, fmtDataHora } from '@/lib/format'
import type { Perfil as PerfilUsuario } from '@/lib/types'
import { useFazenda } from '@/fazenda/FazendaContext'
import { useSync } from '@/offline/SyncContext'

interface Conta {
  id: number
  nome: string
  email: string
  perfil: PerfilUsuario
  criadoEm: string
  fazendas: { id: number; nome: string; municipio?: string; uf?: string }[]
  sessaoExpiraEm?: string
}

const iniciais = (nome = '') =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?'

function mensagem(e: unknown) {
  return e instanceof ApiError ? e.message : 'Sem conexão. Tente novamente quando estiver online.'
}

export default function Perfil() {
  const { usuario, atualizarUsuario, sair } = useAuth()
  const { atual, selecionar } = useFazenda()
  const { pendentes } = useSync()
  const toast = useToast()
  const confirmar = useConfirmar()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const conta = useQuery({ queryKey: ['conta'], queryFn: () => api<Conta>('/conta') })

  const [nome, setNome] = useState<string>()
  const salvarNome = useMutation({
    mutationFn: (n: string) => api<Conta>('/conta', { method: 'PUT', body: { nome: n } }),
    onSuccess: (c) => {
      qc.setQueryData(['conta'], c)
      atualizarUsuario({ nome: c.nome })
      setNome(undefined)
      toast('sucesso', 'Nome atualizado')
    },
    onError: (e) => toast('erro', mensagem(e)),
  })

  const [senha, setSenha] = useState({ atual: '', nova: '', repetir: '' })
  const [erroSenha, setErroSenha] = useState<string>()
  const trocarSenha = useMutation({
    mutationFn: () => api<void>('/conta/senha', { method: 'POST', body: { senhaAtual: senha.atual, novaSenha: senha.nova } }),
    onSuccess: () => {
      setSenha({ atual: '', nova: '', repetir: '' })
      setErroSenha(undefined)
      toast('sucesso', 'Senha alterada')
    },
    onError: (e) => setErroSenha(mensagem(e)),
  })

  function enviarSenha(e: FormEvent) {
    e.preventDefault()
    if (senha.nova !== senha.repetir) return setErroSenha('As senhas novas não conferem.')
    setErroSenha(undefined)
    trocarSenha.mutate()
  }

  async function sairDaConta() {
    const ok = await confirmar({
      titulo: 'Sair da conta?',
      mensagem: pendentes > 0 ? `${pendentes} lançamento(s) ainda não sincronizado(s) serão perdidos neste aparelho.` : 'Os dados salvos neste aparelho para uso offline serão apagados.',
      confirmar: 'Sair',
      perigo: pendentes > 0,
    })
    if (ok) {
      await sair()
      navigate('/entrar')
    }
  }

  if (conta.isLoading) return <Carregando />
  if (conta.isError && !usuario) return <Erro erro={conta.error} onTentar={() => conta.refetch()} />

  const c = conta.data
  const nomeAtual = c?.nome ?? usuario?.nome ?? ''
  const admin = (c?.perfil ?? usuario?.perfil) === 'ADMIN'

  return (
    <>
      <PageHeader titulo="Meu perfil" subtitulo="Seus dados de acesso e as fazendas em que você trabalha." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Painel titulo="Conta">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-700 text-2xl font-semibold text-white">{iniciais(nomeAtual)}</span>
              <h2 className="mt-3 text-lg font-semibold text-stone-900">{nomeAtual}</h2>
              <p className="text-sm text-stone-500">{c?.email ?? usuario?.email}</p>
              <Badge tom={admin ? 'verde' : 'neutro'} className="mt-2">
                {admin ? 'Administrador' : 'Operador'}
              </Badge>
            </div>
            <dl className="mt-5 space-y-3 border-t border-stone-100 pt-4 text-sm">
              <Linha icon={Mail} rotulo="E-mail" valor={c?.email ?? usuario?.email} />
              <Linha icon={ShieldCheck} rotulo="Permissões" valor={admin ? 'Gerencia cadastros e exclusões' : 'Lançamentos e consultas'} />
              {c && <Linha icon={CalendarDays} rotulo="Membro desde" valor={fmtData(c.criadoEm)} />}
              {c?.sessaoExpiraEm && <Linha icon={Clock} rotulo="Sessão válida até" valor={fmtDataHora(c.sessaoExpiraEm)} />}
            </dl>
            <Button variant="secondary" icon={LogOut} className="mt-5 w-full" onClick={sairDaConta}>
              Sair da conta
            </Button>
          </Painel>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Painel titulo="Dados pessoais" descricao="O nome aparece nos lançamentos e no menu.">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault()
                if (nome?.trim()) salvarNome.mutate(nome.trim())
              }}
            >
              <div className="flex-1">
                <Field label="Nome">
                  {(id) => <Input id={id} value={nome ?? nomeAtual} onChange={(e) => setNome(e.target.value)} maxLength={120} required autoComplete="name" />}
                </Field>
              </div>
              <Button type="submit" icon={UserRound} carregando={salvarNome.isPending} disabled={!nome?.trim() || nome.trim() === nomeAtual}>
                Salvar
              </Button>
            </form>
          </Painel>

          <Painel titulo="Fazendas com acesso" descricao="Toque numa fazenda para trabalhar nela." semPadding>
            {c && c.fazendas.length > 0 ? (
              <ul className="divide-y divide-stone-100">
                {c.fazendas.map((f) => (
                  <li key={f.id}>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                      onClick={() => {
                        selecionar(f.id)
                        navigate('/')
                      }}
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-stone-800">{f.nome}</span>
                        {(f.municipio || f.uf) && <span className="block text-xs text-stone-500">{[f.municipio, f.uf].filter(Boolean).join(' / ')}</span>}
                      </span>
                      {atual?.id === f.id && (
                        <Badge tom="verde" ponto>
                          Atual
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-5 text-sm text-stone-500">{c ? 'Você ainda não participa de nenhuma fazenda.' : 'Disponível quando estiver online.'}</p>
            )}
          </Painel>

          <Painel titulo="Alterar senha" descricao="Mínimo de 10 caracteres, com letras e números. Evite senhas comuns ou com seu nome.">
            <form className="grid gap-3 sm:grid-cols-3" onSubmit={enviarSenha}>
              <Field label="Senha atual">
                {(id) => <Input id={id} type="password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} required maxLength={128} autoComplete="current-password" />}
              </Field>
              <Field label="Nova senha">
                {(id) => <Input id={id} type="password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} required minLength={10} maxLength={128} autoComplete="new-password" />}
              </Field>
              <Field label="Repita a nova senha">
                {(id) => <Input id={id} type="password" value={senha.repetir} onChange={(e) => setSenha({ ...senha, repetir: e.target.value })} required minLength={10} maxLength={128} autoComplete="new-password" />}
              </Field>
              {erroSenha && <p className="text-sm text-red-600 sm:col-span-3" role="alert">{erroSenha}</p>}
              <div className="sm:col-span-3">
                <Button type="submit" icon={KeyRound} carregando={trocarSenha.isPending}>
                  Alterar senha
                </Button>
              </div>
            </form>
          </Painel>
        </div>
      </div>
    </>
  )
}

function Linha({ icon: Icon, rotulo, valor }: { icon: typeof Mail; rotulo: string; valor?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-stone-500">{rotulo}</dt>
        <dd className="truncate text-stone-800">{valor ?? '—'}</dd>
      </div>
    </div>
  )
}
