import { clsx } from 'clsx'
import { Check, ChevronRight, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Sheet } from '@/components/ui'
import { useToast } from '@/components/Toast'
import type { Fazenda } from '@/lib/types'
import { useFazenda } from './FazendaContext'
import { LocalizarFazenda, type Posicao } from './LocalizarFazenda'

interface Contagens {
  talhoes: number
  produtos: number
  veiculos: number
  operadores: number
}

function LocalizarSheet({ fazenda, aberto, onFechar }: { fazenda: Fazenda; aberto: boolean; onFechar: () => void }) {
  const { atualizar } = useFazenda()
  const toast = useToast()
  const [pos, setPos] = useState<Posicao | undefined>(fazenda.latitude != null && fazenda.longitude != null ? { latitude: fazenda.latitude, longitude: fazenda.longitude } : undefined)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    if (!pos) return
    setSalvando(true)
    try {
      await atualizar(fazenda.id, { nome: fazenda.nome, municipio: fazenda.municipio, uf: fazenda.uf, ...pos })
      toast('sucesso', 'Localização da fazenda salva')
      onFechar()
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet aberto={aberto} onFechar={onFechar} titulo="Encontrar a fazenda no mapa">
      <div className="space-y-4">
        <LocalizarFazenda valor={pos} onChange={setPos} sugestao={`${fazenda.nome}, ${fazenda.municipio} ${fazenda.uf}`} alternativa={`${fazenda.municipio} ${fazenda.uf}`} />
        <Button className="w-full" onClick={salvar} disabled={!pos} carregando={salvando}>
          Salvar localização
        </Button>
      </div>
    </Sheet>
  )
}

/** Roteiro de configuração de uma fazenda nova; some quando tudo foi cadastrado. */
export function PrimeirosPassos({ fazenda, contagens }: { fazenda: Fazenda; contagens: Contagens }) {
  const [localizando, setLocalizando] = useState(false)
  const localizada = fazenda.latitude != null && fazenda.longitude != null
  const passos = [
    { feito: localizada, titulo: 'Encontrar a fazenda no mapa', texto: 'Busque pelo nome, use o GPS ou toque no mapa onde fica a sede.', acao: () => setLocalizando(true) },
    { feito: contagens.talhoes > 0, titulo: 'Desenhar os talhões', texto: 'Contorne cada área de plantio no mapa; a área em hectares é calculada.', to: '/colheitas' },
    { feito: contagens.produtos > 0, titulo: 'Cadastrar o estoque', texto: 'Grãos, sementes, insumos e combustível, com o saldo inicial.', to: '/estoque?novo=1' },
    { feito: contagens.veiculos > 0, titulo: 'Cadastrar as máquinas', texto: 'Tratores, colheitadeiras, pulverizadores e veículos.', to: '/frota?novo=1' },
    { feito: contagens.operadores > 0, titulo: 'Montar a equipe', texto: 'Operadores e as máquinas que cada um pode operar.', to: '/equipe?novo=1' },
  ]
  const feitos = passos.filter((p) => p.feito).length
  if (feitos === passos.length) return null

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-brand-200 bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-brand-50/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Primeiros passos em {fazenda.nome}</h2>
          <p className="text-xs text-stone-600">A fazenda começa zerada. Siga as etapas para deixá-la pronta.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-stone-600">
          <div className="h-1.5 w-28 rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(feitos / passos.length) * 100}%` }} />
          </div>
          {feitos} de {passos.length}
        </div>
      </header>
      <ol className="divide-y divide-stone-100">
        {passos.map((p, i) => {
          const conteudo = (
            <>
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  p.feito ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 ring-1 ring-inset ring-stone-300',
                )}
              >
                {p.feito ? <Check className="h-4 w-4" aria-label="Concluído" /> : i === 0 ? <MapPinned className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={clsx('block text-sm font-medium', p.feito ? 'text-stone-400 line-through' : 'text-stone-900')}>{p.titulo}</span>
                {!p.feito && <span className="block text-xs text-stone-500">{p.texto}</span>}
              </span>
              {!p.feito && <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />}
            </>
          )
          const classe = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-stone-50'
          return (
            <li key={p.titulo}>
              {p.feito ? (
                <div className="flex items-center gap-3 px-4 py-3">{conteudo}</div>
              ) : p.to ? (
                <Link to={p.to} className={classe}>{conteudo}</Link>
              ) : (
                <button type="button" onClick={p.acao} className={classe}>{conteudo}</button>
              )}
            </li>
          )
        })}
      </ol>
      <LocalizarSheet key={fazenda.id} fazenda={fazenda} aberto={localizando} onFechar={() => setLocalizando(false)} />
    </section>
  )
}
