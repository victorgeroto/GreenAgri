import { Camera, ImageIcon, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { prepararFoto } from './ImagemProduto'
import { Button, Sheet } from './ui'

/** Foto opcional de um formulário: câmera ou galeria, reduzida no aparelho (funciona offline). */
export function CampoFoto({ valor, onChange, rotulo = 'Foto (opcional)', dica }: { valor?: string; onChange: (foto?: string) => void; rotulo?: string; dica?: string }) {
  const arquivo = useRef<HTMLInputElement>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string>()

  async function escolher(lista: FileList | null) {
    const f = lista?.[0]
    if (!f) return
    setErro(undefined)
    setProcessando(true)
    try {
      onChange(await prepararFoto(f))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível ler a foto')
    } finally {
      setProcessando(false)
      if (arquivo.current) arquivo.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3">
      {valor ? (
        <img src={valor} alt="Prévia da foto" className="h-16 w-16 shrink-0 rounded-md border border-stone-200 object-cover" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 text-stone-400" aria-hidden>
          <ImageIcon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-stone-700">{rotulo}</p>
        {dica && <p className="mb-1.5 text-xs text-stone-500">{dica}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" icon={Camera} carregando={processando} onClick={() => arquivo.current?.click()}>
            {valor ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {valor && <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => onChange(undefined)} aria-label="Remover foto" />}
        </div>
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </div>
      <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files)} />
    </div>
  )
}

/** Miniatura que abre a foto ampliada. */
export function FotoMiniatura({ src, titulo }: { src: string; titulo: string }) {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className="shrink-0 overflow-hidden rounded-md border border-stone-200" aria-label={`Ver foto: ${titulo}`}>
        <img src={src} alt="" className="h-10 w-10 object-cover" loading="lazy" />
      </button>
      <Sheet aberto={aberta} onFechar={() => setAberta(false)} titulo={titulo}>
        <img src={src} alt={titulo} className="w-full rounded-md" />
      </Sheet>
    </>
  )
}
