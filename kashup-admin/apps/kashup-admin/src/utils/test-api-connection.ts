/**
 * Utilitaire pour tester la connexion à l'API backend
 * Aide à diagnostiquer les problèmes de connectivité
 */

import { API_CONFIG } from '@/config/api';

export interface ConnectionTestResult {
  accessible: boolean;
  status?: number;
  statusText?: string;
  responseTime?: number;
  error?: string;
  details?: {
    url: string;
    baseURL: string;
    baseOrigin: string;
  };
}

/**
 * Teste la connexion à l'API backend
 * @param endpoint - Endpoint à tester (défaut: '/health' ou '/')
 * @returns Résultat du test de connexion
 */
export const testApiConnection = async (
  endpoint: string = '/health'
): Promise<ConnectionTestResult> => {
  const startTime = Date.now();
  const testUrl = `${API_CONFIG.baseURL}${endpoint}`;

  const details = {
    url: testUrl,
    baseURL: API_CONFIG.baseURL,
    baseOrigin: API_CONFIG.baseOrigin,
  };

  try {
    console.log('🔍 Test de connexion API:', {
      endpoint,
      testUrl,
      baseURL: API_CONFIG.baseURL,
      baseOrigin: API_CONFIG.baseOrigin,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes pour le test

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const result: ConnectionTestResult = {
      accessible: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      details,
    };

    if (response.ok) {
      console.log('✅ API accessible:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        url: testUrl,
      });
    } else {
      console.warn('⚠️ API accessible mais erreur HTTP:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        url: testUrl,
      });
    }

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    let errorMessage = 'Erreur inconnue';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: Le serveur ne répond pas dans les 10 secondes';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Erreur réseau: Impossible de contacter le serveur';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Erreur réseau: Connexion refusée ou serveur inaccessible';
      } else {
        errorMessage = error.message;
      }
    }

    console.error('❌ API non accessible:', {
      error: errorMessage,
      responseTime: `${responseTime}ms`,
      url: testUrl,
      baseURL: API_CONFIG.baseURL,
    });

    return {
      accessible: false,
      error: errorMessage,
      responseTime,
      details,
    };
  }
};

/**
 * Teste plusieurs endpoints pour diagnostiquer les problèmes
 */
export const testMultipleEndpoints = async (): Promise<{
  results: Array<ConnectionTestResult & { endpoint: string }>;
  summary: {
    total: number;
    accessible: number;
    failed: number;
  };
}> => {
  const endpoints = [
    '/health',
    '/',
    '/partners/categories',
    '/auth/health',
  ];

  console.log('🧪 Test de plusieurs endpoints...');

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const result = await testApiConnection(endpoint);
      return {
        ...result,
        endpoint,
      };
    })
  );

  const accessible = results.filter((r) => r.accessible).length;
  const failed = results.filter((r) => !r.accessible).length;

  const summary = {
    total: results.length,
    accessible,
    failed,
  };

  console.log('📊 Résumé des tests:', summary);

  return {
    results,
    summary,
  };
};

/**
 * Affiche les informations de configuration API
 */
export const logApiConfig = (): void => {
  console.log('🔧 Configuration API actuelle:', {
    baseURL: API_CONFIG.baseURL,
    baseOrigin: API_CONFIG.baseOrigin,
    timeout: `${API_CONFIG.timeout}ms`,
    env: {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      MODE: import.meta.env.MODE,
    },
  });
};

