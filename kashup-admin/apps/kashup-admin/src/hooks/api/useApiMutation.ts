/**
 * Hook wrapper autour de useMutation pour normaliser les réponses API
 */

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type { ApiResponse, ApiError } from '@/types/api';

type UseApiMutationOptions<TData, TVariables, TError = ApiError> = Omit<
  UseMutationOptions<ApiResponse<TData>, TError, TVariables>,
  'mutationFn'
> & {
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>;
  invalidateQueries?: unknown[][]; // Query keys à invalider après succès
};

/**
 * Hook pour les mutations API avec normalisation automatique
 * Invalide automatiquement les queries spécifiées après succès
 */
export const useApiMutation = <TData, TVariables, TError = ApiError>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: Omit<UseApiMutationOptions<TData, TVariables, TError>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  const { invalidateQueries, ...mutationOptions } = options || {};

  return useMutation<ApiResponse<TData>, TError, TVariables>({
    mutationFn,
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Invalider les queries spécifiées
      if (invalidateQueries) {
        invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Appeler le onSuccess personnalisé si fourni
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
  });
};

