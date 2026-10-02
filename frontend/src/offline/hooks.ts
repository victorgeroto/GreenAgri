import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { comCache } from './cache'
import { enviar, type RequisicaoEscrita, type ResultadoEnvio } from './sync'

/** GET com fallback para a última cópia salva no IndexedDB. */
export function useDados<T>(
  caminho: string,
  opcoes: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> = {},
) {
  return useQuery<T>({
    queryKey: [caminho],
    queryFn: () => comCache(caminho, () => api<T>(caminho)),
    ...opcoes,
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
