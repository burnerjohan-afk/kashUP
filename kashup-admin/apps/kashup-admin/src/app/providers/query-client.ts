import { QueryClient } from '@tanstack/react-query';

/**
 * Configuration TanStack Query optimisée pour l'intégration API
 * - staleTime: 30s (données considérées fraîches pendant 30s)
 * - cacheTime: 5min (données gardées en cache 5min après inactivité)
 * - Pas de refetch automatique sur focus de fenêtre
 * - Retry limité à 1 pour éviter les appels multiples
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 secondes
      gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

