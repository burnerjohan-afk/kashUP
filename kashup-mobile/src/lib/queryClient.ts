/**
 * Configuration React Query avec persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

// Persister avec AsyncStorage
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'kashup-query-cache',
});

// Configuration du QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 secondes
      gcTime: 5 * 60 * 1000, // 5 minutes (anciennement cacheTime)
      retry: (failureCount, error: any) => {
        // Ne pas retry sur les erreurs réseau (offline)
        if (error?.code === 'NETWORK_ERROR') {
          return false;
        }
        // Retry jusqu'à 2 fois pour les autres erreurs
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Export du provider avec persistence
export { asyncStoragePersister, PersistQueryClientProvider };

