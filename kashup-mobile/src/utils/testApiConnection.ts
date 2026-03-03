/**
 * Utilitaire pour tester la connexion à l'API
 */

import { api } from '../services/api';

export async function testApiConnection(): Promise<boolean> {
  if (__DEV__) {
    console.log('[Test API] 🧪 Test de connexion API');
  }

  try {
    const response = await api.get('/health');

    if (__DEV__) {
      console.log('[Test API] ✅ Connexion API OK');
      console.log('[Test API] Status:', response.status, response.statusText);
    }

    return response.status === 200;
  } catch (error: any) {
    const errorMessage = error?.message || 'Erreur inconnue';
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch');
    
    if (__DEV__) {
      console.error('[Test API] ❌ Échec connexion API');
      console.error('[Test API] Type:', isTimeout ? 'TIMEOUT' : isNetworkError ? 'NETWORK_ERROR' : 'HTTP_ERROR');
      console.error('[Test API] Message:', errorMessage);
    }

    throw error;
  }
}
