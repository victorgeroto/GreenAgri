import { CheckCircle2, CloudOff, RefreshCw, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { Badge, Button, Card, PageHeader, Vazio } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { fmtDataHora, fmtRelativo } from '@/lib/format'
import { useSync } from '@/offline/SyncContext'
import { descartar, tentarNovamente } from '@/offline/sync'

export default function Sincronizacao() {
  const { online, fila, pendentes, falhas, sincronizando, ultimaSincronizacao, sincronizar } = useSync()
  const toast = useToast()

  async function sincronizarAgora() {
    const r = await sincronizar()
    if (r.interrompido) toast('fila', 'Sem conexão com o servidor. Tentaremos de novo automaticamente.')
    else toast(r.falhas ? 'erro' : 'sucesso', `${r.enviados} enviado(s)${r.falhas ? `, ${r.falhas} recusado(s)` : ''}`)
  }

  return (
    <>
      <PageHeader
        titulo="Sincronização"
        subtitulo={online ? `Conectado${ultimaSincronizacao ? ` · última sincronização ${fmtRelativo(new Date(ultimaSincronizacao).toISOString())}` : ''}` : 'Sem conexão — os lançamentos ficam guardados neste aparelho'}
        acoes={
          <Button icon={RefreshCw} onClick={sincronizarAgora} carregando={sincronizando} disabled={!online || pendentes === 0}>
            Sincronizar
          </Button>
        }
      />

      <Card className="mb-4 text-sm text-stone-600">
        <p>
          O GreenAgri funciona sem internet: telas abrem com a última informação baixada e todo lançamento feito offline entra nesta fila.
          Quando o sinal volta, a fila é enviada na ordem em que foi registrada. Cada movimentação tem um identificador único, então
          reenvios nunca duplicam o estoque.
        </p>
      </Card>

      {fila.length === 0 ? (
        <Vazio icon={CheckCircle2} titulo="Tudo sincronizado" texto="Nenhum lançamento aguardando envio." />
      ) : (
        <Card className="py-1">
          <ul className="divide-y divide-stone-100">
            {fila.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                {item.status === 'pendente' ? <CloudOff className="mt-0.5 h-5 w-5 text-amber-600" /> : <XCircle className="mt-0.5 h-5 w-5 text-red-600" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.descricao}</p>
                  <p className="text-xs text-stone-500">
                    Registrado {fmtDataHora(new Date(item.criadoEm).toISOString())}
                    {item.tentativas > 0 && ` · ${item.tentativas} tentativa(s)`}
                  </p>
                  {item.erro && <p className="mt-1 text-xs text-red-700">Recusado pelo servidor: {item.erro}</p>}
                </div>
                {item.status === 'falhou' ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => tentarNovamente(item.id!)} aria-label="Tentar novamente" />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={() => confirm('Descartar este lançamento?') && descartar(item.id!)}
                      aria-label="Descartar"
                    />
                  </div>
                ) : (
                  <Badge tom="amarelo">pendente</Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {falhas > 0 && (
        <p className="mt-3 text-xs text-stone-500">
          Itens recusados não são reenviados automaticamente: corrija o motivo (ex.: lance a entrada que faltou) e toque em tentar novamente, ou descarte.
        </p>
      )}
    </>
  )
}
