/**
 * Client HTTP commun basé sur fetch natif
 * Gère JWT, refresh token, offline, et normalisation des réponses
 */

import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { getApiBaseUrl } from '../../config/api';
import { ApiError, StandardResponse } from '../../types/api';
import { logger } from '../../utils/logger';

const baseURL = getApiBaseUrl();
const API_CONFIG = {
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// Clés de stockage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kashup_access_token',
  REFRESH_TOKEN: 'kashup_refresh_token',
} as const;

// Types
export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    requestId?: string;
  };
}

/**
 * Récupère le token d'accès depuis SecureStore
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    logger.error('[API Client] Erreur récupération token:', error);
    return null;
  }
}

/**
 * Stocke le token d'accès
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    logger.error('[API Client] Erreur stockage token:', error);
    throw error;
  }
}

/**
 * Récupère le refresh token
 */
async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    logger.error('[API Client] Erreur récupération refresh token:', error);
    return null;
  }
}

/**
 * Stocke le refresh token
 */
export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    logger.error('[API Client] Erreur stockage refresh token:', error);
    throw error;
  }
}

/**
 * Supprime les tokens
 */
export async function clearAuthTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  } catch (error) {
    logger.error('[API Client] Erreur suppression tokens:', error);
  }
}

/**
 * Rafraîchit le token d'accès
 */
async function refreshAccessToken(): Promise<string> {
  const refreshTokenValue = await getRefreshToken();
  if (!refreshTokenValue) {
    throw new ApiError('Aucun refresh token disponible', 401, 'NO_REFRESH_TOKEN');
  }

  try {
    // Éviter les doubles slashes
    const baseUrlClean = baseURL.replace(/\/+$/, '');
    const refreshUrl = `${baseUrlClean}/auth/refresh`;
    console.log(`[API] 🔄 Refresh token - URL: ${refreshUrl}`);
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    const data: StandardResponse<{
      tokens: { accessToken: string; refreshToken: string };
    }> = await response.json();

    if (!data.success || !data.data) {
      throw new ApiError(data.message || 'Erreur de refresh token', data.statusCode);
    }

    await setAuthToken(data.data.tokens.accessToken);
    await setRefreshToken(data.data.tokens.refreshToken);

    return data.data.tokens.accessToken;
  } catch (error) {
    await clearAuthTokens();
    throw error;
  }
}

/**
 * Nettoie les paramètres de requête
 */
function cleanQueryParams(params: Record<string, any>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      if (value instanceof Date) {
        cleaned[key] = value.toISOString();
      } else {
        cleaned[key] = String(value);
      }
    }
  }

  return cleaned;
}

/**
 * Construit l'URL avec les paramètres de requête
 */
function buildURL(endpoint: string, params?: Record<string, any>): string {
  // Éviter les doubles slashes entre baseURL et endpoint
  const baseUrlClean = baseURL.replace(/\/+$/, '');
  const endpointClean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrlClean}${endpointClean}`;

  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const cleaned = cleanQueryParams(params);
  const searchParams = new URLSearchParams(cleaned);
  return `${url}${url.includes('?') ? '&' : '?'}${searchParams.toString()}`;
}

/**
 * Détecte si l'erreur est une erreur réseau (offline)
 */
function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError &&
    (error.message === 'Network request failed' ||
      error.message === 'Failed to fetch' ||
      error.message.includes('network'))
  );
}

/**
 * Client API principal
 */
export class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Effectue une requête HTTP
   */
  async request<T>(
    method: string,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { params, skipAuth = false, skipRefresh = false, ...fetchOptions } = options;
    const requestId = uuidv4();
    const url = buildURL(endpoint, params);

    // Headers par défaut
    const headers: HeadersInit = {
      ...API_CONFIG.headers,
      'X-Request-Id': requestId,
      ...fetchOptions.headers,
    };

    // Ajout du token d'authentification
    if (!skipAuth) {
      const token = await getAuthToken();
      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }
    }

    // Log de l'URL finale appelée
    logger.info(`[API] ${method} ${endpoint} [requestId: ${requestId}]`);
    console.log(`[API] 🔗 URL finale appelée: ${url}`);
    console.log(`[API] ⏱️  Timeout configuré: ${API_CONFIG.timeout}ms`);

    // Créer un AbortController pour gérer le timeout manuellement
    // (AbortSignal.timeout peut ne pas être supporté sur toutes les versions)
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      timeoutId = setTimeout(() => {
        console.log(`[API] ⏰ Timeout atteint après ${API_CONFIG.timeout}ms pour ${url}`);
        controller.abort();
      }, API_CONFIG.timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        method,
        headers,
        body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
        signal: controller.signal,
      });

      // Annuler le timeout si la réponse arrive
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Gestion du refresh token automatique (401)
      if (response.status === 401 && !skipAuth && !skipRefresh) {
        const newToken = await this.handleRefresh();
        // Retry avec le nouveau token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        
        // Nouveau controller pour le retry
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => {
          console.log(`[API] ⏰ Timeout retry après ${API_CONFIG.timeout}ms pour ${url}`);
          retryController.abort();
        }, API_CONFIG.timeout);
        
        try {
          const retryResponse = await fetch(url, {
            ...fetchOptions,
            method,
            headers,
            body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
            signal: retryController.signal,
          });
          clearTimeout(retryTimeoutId);
          return this.handleResponse<T>(retryResponse, requestId);
        } catch (retryError) {
          clearTimeout(retryTimeoutId);
          throw retryError;
        }
      }

      return this.handleResponse<T>(response, requestId);
    } catch (error: any) {
      // Nettoyer le timeout en cas d'erreur
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Gestion des erreurs réseau (offline)
      if (isNetworkError(error)) {
        console.error(`[API] ❌ Network error: ${endpoint}`);
        console.error(`[API] ❌ URL tentée: ${url}`);
        console.error(`[API] ❌ Erreur:`, error.message);
        logger.error(`[API] Network error: ${endpoint} [requestId: ${requestId}]`);
        throw new ApiError('Pas de connexion réseau. Vérifiez que le serveur API est démarré et accessible.', 0, 'NETWORK_ERROR');
      }

      // Timeout
      if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
        console.error(`[API] ⏰ Timeout: ${endpoint}`);
        console.error(`[API] ⏰ URL tentée: ${url}`);
        console.error(`[API] ⏰ Vérifiez que le serveur API est démarré sur ${baseURL}`);
        logger.error(`[API] Timeout: ${endpoint} [requestId: ${requestId}]`);
        throw new ApiError(`La requête a expiré après ${API_CONFIG.timeout}ms. Vérifiez que le serveur API est démarré sur ${baseURL}`, 408, 'TIMEOUT');
      }

      console.error(`[API] ❌ Erreur inconnue: ${endpoint}`);
      console.error(`[API] ❌ URL tentée: ${url}`);
      console.error(`[API] ❌ Erreur:`, error);
      logger.error(`[API] Error: ${endpoint} [requestId: ${requestId}]`, error);
      throw error;
    }
  }

  /**
   * Gère le refresh token (une seule requête à la fois)
   */
  private async handleRefresh(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = refreshAccessToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Traite la réponse HTTP
   */
  private async handleResponse<T>(response: Response, requestId: string): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: StandardResponse<T>;
    if (isJson) {
      data = await response.json();
      // Log de la réponse brute pour debug
      console.log(`[API] 📥 Réponse API brute [${response.status}]:`, JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      const text = await response.text();
      console.log(`[API] ⚠️  Réponse non-JSON [${response.status}]:`, text.substring(0, 200));
      throw new ApiError(
        `Réponse non-JSON: ${text.substring(0, 100)}`,
        response.status,
        'INVALID_RESPONSE'
      );
    }

    // Log de la réponse
    logger.info(
      `[API] ${response.status} ${response.statusText} [requestId: ${requestId}]`
    );

    // Si erreur, lancer une exception
    if (!data.success || response.status >= 400) {
      const code = data.meta?.details?.code;
      const fieldErrors = data.meta?.details?.fieldErrors;
      throw new ApiError(
        data.message || 'Une erreur est survenue',
        data.statusCode || response.status,
        code,
        fieldErrors
      );
    }

    // Extraire les données et métadonnées
    const pagination = data.meta?.pagination;
    return {
      data: data.data as T,
      meta: {
        pagination: pagination
          ? {
              page: pagination.page,
              pageSize: pagination.limit || pagination.pageSize || 50,
              total: pagination.total,
              totalPages: pagination.totalPages,
              hasNext: pagination.hasNext,
              hasPrev: pagination.hasPrev,
            }
          : undefined,
        requestId,
      },
    };
  }

  /**
   * Méthodes HTTP simplifiées
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, options);
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...options, body });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...options, body });
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...options, body });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, options);
  }
}

// Instance singleton
export const apiClient = new ApiClient();

