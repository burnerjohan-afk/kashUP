/**
 * Client HTTP centralisé avec gestion JWT, refresh token, et request ID
 * Utilise fetch natif pour une meilleure compatibilité
 */

import { API_CONFIG } from '@/config/api';
import { useAuthStore } from '@/store/auth-store';
import { logger } from '@/utils/logger';
import type { ApiResponse, ApiError } from '@/types/api';

// Générer un UUID simple pour les request IDs
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Récupérer le token JWT depuis le store
 * Note: Cette fonction ne peut pas être un hook React car elle est utilisée dans fetchWithAuth
 */
const getAuthToken = (): string | null => {
  try {
    const { accessToken } = useAuthStore.getState();
    return accessToken || null;
  } catch {
    return null;
  }
};

/**
 * Récupérer le refresh token depuis le store
 */
const getRefreshToken = (): string | null => {
  try {
    const { refreshToken } = useAuthStore.getState();
    return refreshToken || null;
  } catch {
    return null;
  }
};

/**
 * Rafraîchir le token d'accès
 */
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  const { setCredentials, clearSession, user } = useAuthStore.getState();

  if (!refreshToken || !user) {
    clearSession();
    return null;
  }

  try {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json<{
      success: boolean;
      data?: {
        user: unknown;
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      };
    }>();

    if (data.success && data.data) {
      setCredentials({
        accessToken: data.data.tokens.accessToken,
        refreshToken: data.data.tokens.refreshToken,
        user: data.data.user as Parameters<typeof setCredentials>[0]['user'],
      });
      return data.data.tokens.accessToken;
    }
  } catch (error) {
    logger.logError('Erreur lors du refresh token', error);
    clearSession();
  }

  return null;
};

/**
 * Effectuer une requête HTTP avec gestion automatique du token et refresh
 */
const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<Response> => {
  const token = getAuthToken();
  const requestId = generateRequestId();
  const startTime = Date.now();

  const headers = new Headers({
    ...API_CONFIG.headers,
    ...options.headers,
  });

  // Ajouter le token JWT
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Ajouter le request ID
  headers.set('X-Request-Id', requestId);

  logger.logRequest(options.method || 'GET', url, requestId);

  try {
    const response = await fetch(`${API_CONFIG.baseURL}${url}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    });

    const duration = Date.now() - startTime;

    // Gérer les erreurs 401 (non autorisé)
    if (response.status === 401 && retryOn401) {
      logger.logResponse({
        method: options.method || 'GET',
        url,
        requestId,
        statusCode: response.status,
        statusText: response.statusText,
        duration,
      });

      // Tenter de rafraîchir le token
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Réessayer la requête avec le nouveau token
        return fetchWithAuth(url, options, false);
      }

      // Si le refresh échoue, rediriger vers login
      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=session_expired';
      }
    }

    logger.logResponse({
      method: options.method || 'GET',
      url,
      requestId,
      statusCode: response.status,
      statusText: response.statusText,
      duration,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.logResponse({
      method: options.method || 'GET',
      url,
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Normaliser une réponse API en format standardisé
 */
const normalizeResponse = async <T>(
  response: Response
): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    let errorData: ApiError;

    if (isJson) {
      const data = await response.json<{
        statusCode: number;
        success: boolean;
        message: string;
        meta?: {
          details?: {
            code?: string;
            field?: string;
            [key: string]: unknown;
          };
        };
      }>();

      errorData = {
        statusCode: data.statusCode || response.status,
        success: false,
        message: data.message || response.statusText || 'Erreur inconnue',
        meta: data.meta,
      };
    } else {
      errorData = {
        statusCode: response.status,
        success: false,
        message: response.statusText || 'Erreur inconnue',
      };
    }

    throw errorData;
  }

  if (isJson) {
    const data = await response.json<{
      statusCode: number;
      success: boolean;
      message: string;
      data: T | null;
      meta?: {
        pagination?: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        };
        requestId?: string;
        [key: string]: unknown;
      };
    }>();

    return {
      data: data.data ?? ([] as unknown as T),
      meta: {
        pagination: data.meta?.pagination
          ? {
              page: data.meta.pagination.page,
              pageSize: data.meta.pagination.pageSize,
              total: data.meta.pagination.total,
              totalPages: data.meta.pagination.totalPages,
              hasNextPage: data.meta.pagination.hasNextPage ?? false,
              hasPrevPage: data.meta.pagination.hasPrevPage ?? false,
            }
          : undefined,
        requestId: data.meta?.requestId,
      },
    };
  }

  // Si ce n'est pas du JSON, retourner la réponse textuelle
  const text = await response.text();
  return {
    data: text as unknown as T,
  };
};

/**
 * Client API avec méthodes HTTP standardisées
 */
export const apiClient = {
  /**
   * GET request
   */
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
    const queryString = params
      ? `?${new URLSearchParams(
          Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)])
        ).toString()}`
      : '';

    const response = await fetchWithAuth(`${url}${queryString}`, {
      method: 'GET',
    });

    return normalizeResponse<T>(response);
  },

  /**
   * POST request
   */
  post: async <T>(
    url: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const isFormData = body instanceof FormData;

    const response = await fetchWithAuth(
      url,
      {
        ...options,
        method: 'POST',
        body: isFormData ? body : JSON.stringify(body),
        headers: isFormData
          ? undefined // Laisser le navigateur définir Content-Type pour FormData
          : {
              'Content-Type': 'application/json',
            },
      },
      true
    );

    return normalizeResponse<T>(response);
  },

  /**
   * PATCH request
   */
  patch: async <T>(
    url: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const isFormData = body instanceof FormData;

    const response = await fetchWithAuth(
      url,
      {
        ...options,
        method: 'PATCH',
        body: isFormData ? body : JSON.stringify(body),
        headers: isFormData
          ? undefined
          : {
              'Content-Type': 'application/json',
            },
      },
      true
    );

    return normalizeResponse<T>(response);
  },

  /**
   * PUT request
   */
  put: async <T>(
    url: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> => {
    const isFormData = body instanceof FormData;

    const response = await fetchWithAuth(
      url,
      {
        ...options,
        method: 'PUT',
        body: isFormData ? body : JSON.stringify(body),
        headers: isFormData
          ? undefined
          : {
              'Content-Type': 'application/json',
            },
      },
      true
    );

    return normalizeResponse<T>(response);
  },

  /**
   * DELETE request
   */
  delete: async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    const response = await fetchWithAuth(
      url,
      {
        ...options,
        method: 'DELETE',
      },
      true
    );

    return normalizeResponse<T>(response);
  },
};

