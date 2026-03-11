/**
 * Hook wrapper autour de useQuery pour normaliser les réponses API
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { ApiResponse, ApiError } from '@/types/api';

type UseApiQueryOptions<TData, TError = ApiError> = Omit<
  UseQueryOptions<ApiResponse<TData>, TError>,
  'queryFn'
> & {
  queryFn: () => Promise<ApiResponse<TData>>;
};

/**
 * Hook pour les requêtes API avec normalisation automatique
 */
export const useApiQuery = <TData, TError = ApiError>(
  queryKey: unknown[],
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: Omit<UseApiQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<ApiResponse<TData>, TError>({
    queryKey,
    queryFn,
    ...options,
  });
};

