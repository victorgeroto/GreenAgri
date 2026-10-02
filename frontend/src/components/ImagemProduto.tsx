import { clsx } from 'clsx'
import { Bean, Box, Fuel, FlaskConical, SprayCan, Sprout, Wheat, Wrench, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { Categoria, Produto } from '@/lib/types'

const ICONE: Record<Categoria, LucideIcon> = {
  GRAOS: Wheat,
  SEMENTES: Sprout,
  FERTILIZANTES: FlaskConical,
  DEFENSIVOS: SprayCan,
  RACAO: Bean,
  COMBUSTIVEL: Fuel,
  PECAS: Wrench,
  OUTROS: Box,
}

const tamanhos = {
  sm: 'h-9 w-9 rounded-md',
  md: 'h-12 w-12 rounded-md',
  lg: 'aspect-[4/3] w-full rounded-lg',
}

/** Foto do produto; sem foto (ou se falhar), mostra o ícone da categoria. */
export function ImagemProduto({ produto, tamanho = 'sm', className }: { produto: Pick<Produto, 'nome' | 'categoria' | 'imagem'>; tamanho?: keyof typeof tamanhos; className?: string }) {
  const [falhou, setFalhou] = useState(false)
  const Icone = ICONE[produto.categoria]
  if (produto.imagem && !falhou) {
    return (
      <img
        src={produto.imagem}
        alt={tamanho === 'lg' ? produto.nome : ''}
        loading="lazy"
        onError={() => setFalhou(true)}
        className={clsx('shrink-0 border border-stone-200 bg-stone-100 object-cover', tamanhos[tamanho], className)}
      />
    )
  }
  return (
    <span className={clsx('flex shrink-0 items-center justify-center border border-stone-200 bg-stone-50 text-stone-400', tamanhos[tamanho], className)} aria-hidden>
      <Icone className={tamanho === 'lg' ? 'h-10 w-10' : tamanho === 'md' ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={1.6} />
    </span>
  )
}

const LADO_MAX = 800

/**
 * Redimensiona a foto escolhida (câmera ou galeria) para no máximo 800 px e
 * converte em JPEG. Fica pequena o bastante para ir na fila offline e no banco.
 */
export async function prepararFoto(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * k)
    canvas.height = Math.round(img.naturalHeight * k)
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    for (const qualidade of [0.82, 0.7, 0.55]) {
      const dataUrl = canvas.toDataURL('image/jpeg', qualidade)
      if (dataUrl.length < 380_000) return dataUrl
    }
    throw new Error('A foto ficou grande demais mesmo após a compressão')
  } finally {
    URL.revokeObjectURL(url)
  }
}
