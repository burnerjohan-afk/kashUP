/**
 * Client API Kashup selon ARCHITECTURE_COMMUNICATION_KASHUP.md
 * 
 * ⚠️ RÈGLES OBLIGATOIRES:
 * - Détection dynamique de l'IP LAN via /api/v1/debug/network
 * - Format de réponse: { data, error, meta }
 * - Authentification JWT obligatoire (sauf /health et /debug/network)
 * - Gestion des erreurs 501 (Not Implemented)
 * - Timeout: 30s côté client, 25s côté serveur
 */

import { detectNetworkInfo, getDynamicApiBaseUrl, resetNetworkCache } from './network-detector';
import { useAuthStore } from '@/store/auth-store';
import { API_CONFIG } from '@/config/api';
import type { ApiResponseFormat } from '@/types/api';

let dynamicBaseUrl: string | null = null;
let baseUrlInitialized = false;

/**
 * Initialise l'URL de base de l'API avec détection dynamique de l'IP LAN
 * Doit être appelé au démarrage de l'application
 */
export const initializeApiBaseUrl = async (): Promise<string> => {
  if (baseUrlInitialized && dynamicBaseUrl) {
    return dynamicBaseUrl;
  }

  try {
    const fallbackUrl = API_CONFIG.fallbackURL;
    dynamicBaseUrl = await getDynamicApiBaseUrl(fallbackUrl);
    baseUrlInitialized = true;

    if (import.meta.env.DEV) {
      console.log('✅ URL API initialisée avec IP LAN dynamique:', dynamicBaseUrl);
    }

    return dynamicBaseUrl;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de l\'initialisation de l\'URL API:', error);
    }
    // En cas d'erreur, utiliser le fallback
    dynamicBaseUrl = API_CONFIG.baseURL;
    baseUrlInitialized = true;
    return dynamicBaseUrl;
  }
};

/**
 * Obtient l'URL de base de l'API (avec détection dynamique si disponible)
 */
export const getApiBaseUrl = (): string => {
  if (dynamicBaseUrl) {
    return dynamicBaseUrl;
  }
  return API_CONFIG.baseURL;
};

/**
 * Obtient l'origine de l'API (sans /api/v1) pour construire les URLs d'images
 * Ex: https://api.example.com/api/v1 → https://api.example.com
 */
export const getApiBaseOrigin = (): string => {
  try {
    const url = getApiBaseUrl();
    const u = new URL(url);
    return u.origin;
  } catch {
    return API_CONFIG.baseOrigin;
  }
};

/**
 * Headers d'authentification JWT
 */
const getAuthHeaders = (): Record<string, string> => {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
};

/**
 * Vérifie si un endpoint nécessite une authentification
 */
const requiresAuth = (endpoint: string): boolean => {
  const publicEndpoints = ['/health', '/debug/network'];
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));
};

/**
 * Gère les erreurs selon le format { data, error, meta }
 */
const handleApiError = async (
  response: Response,
  endpoint: string
): Promise<ApiResponseFormat<never>> => {
  let errorData: { message: string; code: string; details?: any } | null = null;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const json = await response.json();
      // Backend peut retourner { error } ou { message, meta: { details } } (StandardResponse)
      const metaDetails = json.meta?.details;
      const details =
        (typeof metaDetails === 'object' && metaDetails?.details != null
          ? metaDetails.details
          : null) ??
        json.error?.details ??
        json.details ??
        json;
      errorData = json.error || {
        message: json.message || `Erreur HTTP ${response.status}`,
        code: metaDetails?.code || json.code || response.status.toString(),
        details,
      };
    } else {
      const text = await response.text();
      errorData = {
        message: text || `Erreur HTTP ${response.status}`,
        code: response.status.toString(),
      };
    }
  } catch {
    errorData = {
      message: `Erreur HTTP ${response.status}: ${response.statusText}`,
      code: response.status.toString(),
    };
  }

  // Gestion spéciale des erreurs 501 (Not Implemented)
  if (response.status === 501) {
    if (import.meta.env.DEV) {
      console.warn(`⚠️ Endpoint non implémenté: ${endpoint}`);
    }
    errorData = {
      message: `Cette fonctionnalité n'est pas encore disponible (${endpoint})`,
      code: 'NOT_IMPLEMENTED',
      details: { endpoint, status: 501 },
    };
  }

  return {
    data: null,
    error: errorData,
    meta: null,
  };
};

/**
 * Effectue une requête GET
 */
export const apiGet = async <T>(
  endpoint: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>
): Promise<ApiResponseFormat<T>> => {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  // Nettoyer les paramètres de recherche
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers = requiresAuth(endpoint) ? getAuthHeaders() : { 'Accept': 'application/json' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return handleApiError(response, endpoint);
    }

    const result = await response.json();

    // Le backend retourne { data, error, meta }
    if (result.error) {
      return {
        data: null,
        error: result.error,
        meta: result.meta || null,
      };
    }

    return {
      data: result.data,
      error: null,
      meta: result.meta || null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: `Timeout: Le serveur n'a pas répondu dans les ${API_CONFIG.timeout}ms`,
          code: 'TIMEOUT',
        },
        meta: null,
      };
    }

    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Erreur réseau inconnue',
        code: 'NETWORK_ERROR',
      },
      meta: null,
    };
  }
};

/**
 * Effectue une requête POST
 */
export const apiPost = async <T>(
  endpoint: string,
  body?: FormData | object
): Promise<ApiResponseFormat<T>> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = requiresAuth(endpoint) ? getAuthHeaders() : { 'Accept': 'application/json' };

  // Ne pas définir Content-Type pour FormData (le navigateur le fait automatiquement)
  const isFormData = body instanceof FormData;
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    if (import.meta.env.DEV) {
      console.log('📤 Requête POST:', {
        url,
        endpoint,
        isFormData,
        hasBody: !!body,
        headers: Object.keys(headers),
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (import.meta.env.DEV) {
      console.log('📥 Réponse POST:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
    }

    if (!response.ok) {
      return handleApiError(response, endpoint);
    }

    const result = await response.json();

    if (import.meta.env.DEV) {
      console.log('📥 Réponse API POST:', {
        endpoint,
        status: response.status,
        hasError: !!result.error,
        hasData: !!result.data,
        resultKeys: Object.keys(result),
      });
    }

    // Le backend peut retourner { error: {...} } directement ou { data, error, meta }
    if (result.error) {
      return {
        data: null,
        error: result.error,
        meta: result.meta || null,
      };
    }

    // Si pas d'erreur mais pas de data non plus, vérifier le format
    if (result.data === undefined && !result.error) {
      // Peut-être que le backend retourne directement les données
      if (import.meta.env.DEV) {
        console.warn('⚠️ Format de réponse inattendu pour POST, peut-être que les données sont directement dans result:', result);
      }
      // Essayer de retourner result directement comme data
      return {
        data: result as T,
        error: null,
        meta: result.meta || null,
      };
    }

    return {
      data: result.data,
      error: null,
      meta: result.meta || null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: `Timeout: Le serveur n'a pas répondu dans les ${API_CONFIG.timeout}ms`,
          code: 'TIMEOUT',
        },
        meta: null,
      };
    }

    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Erreur réseau inconnue',
        code: 'NETWORK_ERROR',
      },
      meta: null,
    };
  }
};

/**
 * Effectue une requête PATCH
 */
export const apiPatch = async <T>(
  endpoint: string,
  body?: FormData | object
): Promise<ApiResponseFormat<T>> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = requiresAuth(endpoint) ? getAuthHeaders() : { 'Accept': 'application/json' };

  const isFormData = body instanceof FormData;
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return handleApiError(response, endpoint);
    }

    const result = await response.json();

    if (result.error) {
      return {
        data: null,
        error: result.error,
        meta: result.meta || null,
      };
    }

    return {
      data: result.data,
      error: null,
      meta: result.meta || null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: `Timeout: Le serveur n'a pas répondu dans les ${API_CONFIG.timeout}ms`,
          code: 'TIMEOUT',
        },
        meta: null,
      };
    }

    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Erreur réseau inconnue',
        code: 'NETWORK_ERROR',
      },
      meta: null,
    };
  }
};

/**
 * Effectue une requête DELETE
 */
export const apiDelete = async <T>(endpoint: string): Promise<ApiResponseFormat<T>> => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = requiresAuth(endpoint) ? getAuthHeaders() : { 'Accept': 'application/json' };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return handleApiError(response, endpoint);
    }

    const result = await response.json();

    if (result.error) {
      return {
        data: null,
        error: result.error,
        meta: result.meta || null,
      };
    }

    return {
      data: result.data,
      error: null,
      meta: result.meta || null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: {
          message: `Timeout: Le serveur n'a pas répondu dans les ${API_CONFIG.timeout}ms`,
          code: 'TIMEOUT',
        },
        meta: null,
      };
    }

    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Erreur réseau inconnue',
        code: 'NETWORK_ERROR',
      },
      meta: null,
    };
  }
};

/**
 * Réinitialise la configuration API (utile pour les tests ou changement de réseau)
 */
export const resetApiConfig = (): void => {
  dynamicBaseUrl = null;
  baseUrlInitialized = false;
  resetNetworkCache();
  if (import.meta.env.DEV) {
    console.log('🔄 Configuration API réinitialisée');
  }
};

