import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { useFazenda } from '@/fazenda/FazendaContext'
import { api } from '@/lib/api'
import { comCache } from './cache'
import { enviar, type RequisicaoEscrita, type ResultadoEnvio } from './sync'

/** GET com fallback para a última cópia salva no IndexedDB. */
export function useDados<T>(
  caminho: string,
  opcoes: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> = {},
) {
  const { atual } = useFazenda()
  const fazendaId = atual?.id
  return useQuery<T>({
    // A fazenda faz parte da chave: trocar de fazenda busca (e guarda offline) os dados dela.
    queryKey: [fazendaId, caminho],
    queryFn: () => comCache(`${fazendaId}:${caminho}`, () => api<T>(caminho, { fazendaId })),
    ...opcoes,
    enabled: !!fazendaId && (opcoes.enabled ?? true),
  })
}

/** Escrita que funciona offline: envia na hora ou guarda na fila e sincroniza depois. */
export function useEscrita<TEntrada, TSaida = unknown>(montar: (entrada: TEntrada) => RequisicaoEscrita) {
  const queryClient = useQueryClient()
  return useMutation<ResultadoEnvio<TSaida>, Error, TEntrada>({
    networkMode: 'always',
    mutationFn: (entrada) => enviar<TSaida>(montar(entrada)),
    onSuccess: (r) => {
      if (r.status === 'enviado') void queryClient.invalidateQueries()
    },
  })
}
