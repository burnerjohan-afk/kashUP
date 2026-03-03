/**
 * Client API centralisé pour communiquer avec kashup-api
 * Détection automatique de l'IP du serveur Expo via Constants
 * Gère l'authentification JWT, le refresh token automatique, et le format StandardResponse
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '../config/api';
import { ApiError, StandardResponse, unwrapStandardResponse } from '../types/api';

// Clés de stockage (SecureStore pour la sécurité)
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kashup_access_token',
  REFRESH_TOKEN: 'kashup_refresh_token',
} as const;

// Base URL API (détectée automatiquement)
const API_BASE_URL = getApiBaseUrl();

// Instance axios
let axiosInstance: AxiosInstance | null = null;

/**
 * Récupère le token d'accès depuis SecureStore (sécurisé)
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('[api] Erreur lors de la récupération du token:', error);
    return null;
  }
}

/**
 * Stocke le token d'accès dans SecureStore (sécurisé)
 */
export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('[api] Erreur lors du stockage du token:', error);
    throw error;
  }
}

/**
 * Récupère le refresh token depuis SecureStore (sécurisé)
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[api] Erreur lors de la récupération du refresh token:', error);
    return null;
  }
}

/**
 * Stocke le refresh token dans SecureStore (sécurisé)
 */
export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('[api] Erreur lors du stockage du refresh token:', error);
    throw error;
  }
}

/**
 * Indique si un refresh token est disponible (utilisateur susceptible d'être authentifié)
 */
export async function hasRefreshToken(): Promise<boolean> {
  const token = await getRefreshToken();
  return token != null && token.trim() !== '';
}

/**
 * Supprime les tokens d'authentification
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  } catch (error) {
    console.error('[api] Erreur lors de la suppression des tokens:', error);
  }
}

/**
 * Rafraîchit le token d'accès en utilisant le refresh token
 */
export async function refreshToken(): Promise<void> {
  try {
    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) {
      throw new ApiError('Aucun refresh token disponible', 401);
    }

    const refreshUrl = `${API_BASE_URL}/auth/refresh`;
    if (__DEV__) {
      console.log(`[API] 🔄 Refresh token - URL: ${refreshUrl}`);
    }
    
    const response = await axios.post<StandardResponse<{
      user: any;
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }>>(refreshUrl, {
      refreshToken: refreshTokenValue,
    });

    const data = unwrapStandardResponse(response.data);
    
    await setAuthToken(data.tokens.accessToken);
    await setRefreshToken(data.tokens.refreshToken);
  } catch (error) {
    // Si le refresh échoue, supprimer les tokens
    await clearAuthToken();
    throw error;
  }
}

/**
 * Nettoie les paramètres de requête (supprime undefined, null, '', 'all')
 */
export function cleanQueryParams(params: Record<string, any>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      cleaned[key] = String(value);
    }
  }
  
  return cleaned;
}

/**
 * Obtient ou crée l'instance axios configurée
 */
function getApiClient(): AxiosInstance {
  if (!axiosInstance) {
    axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 secondes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur de requête : ajoute le token d'authentification
    axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse : gère le refresh token automatique
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Si erreur 401 et pas déjà retry
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            const token = await getAuthToken();
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance!(originalRequest);
          } catch (refreshError) {
            // Le refresh a échoué, rediriger vers login
            await clearAuthToken();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  return axiosInstance;
}

/**
 * Instance axios exportée pour utilisation directe
 */
export const api = getApiClient();

/**
 * Client API générique qui retourne StandardResponse<T>
 */
export async function apiClient<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  params?: Record<string, any>
): Promise<StandardResponse<T>> {
  const requestStartTime = Date.now();
  try {
    const client = getApiClient();
    const cleanedParams = params ? cleanQueryParams(params) : undefined;

    // Construire l'URL complète pour les logs
    const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const urlWithParams = cleanedParams 
      ? `${fullUrl}?${new URLSearchParams(cleanedParams as any).toString()}`
      : fullUrl;

    if (__DEV__) {
      console.log(`[API] ${method} ${urlWithParams}`);
      console.log(`[API] 📍 Endpoint: ${endpoint}`);
      console.log(`[API] 🔗 URL complète: ${urlWithParams}`);
      console.log(`[API] ⏱️  Début: ${new Date().toISOString()}`);
    }

    const response = await client.request<StandardResponse<T>>({
      method,
      url: endpoint,
      data,
      params: cleanedParams,
    });

    const requestDuration = Date.now() - requestStartTime;
    
    if (__DEV__) {
      console.log(`[API] ✅ ${method} ${endpoint} → ${response.status} ${response.statusText}`);
      console.log(`[API] ⏱️  Durée: ${requestDuration}ms`);
      const responseData = response.data?.data;
      if (responseData && typeof responseData === 'object' && 'partners' in responseData) {
        const partners = (responseData as { partners: any[] }).partners;
        console.log(`[API] 📊 Taille liste: ${Array.isArray(partners) ? partners.length : 'N/A'}`);
      } else if (Array.isArray(responseData)) {
        console.log(`[API] 📊 Taille liste: ${responseData.length}`);
      }
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const fullUrl = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

      const requestDuration = Date.now() - requestStartTime;
      const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND';
      const isConnectionError = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      
      if (__DEV__) {
        console.error(`[API] ❌ ${method} ${endpoint} → Erreur`);
        console.error(`[API] 🔗 URL tentée: ${fullUrl}`);
        console.error(`[API] 📊 Status: ${error.response?.status || 'N/A'}`);
        console.error(`[API] ⚠️  Type: ${isTimeout ? 'TIMEOUT' : isNetworkError ? 'RÉSEAU' : 'AUTRE'}`);
        console.error(`[API] 💬 Message: ${error.message}`);
        console.error(`[API] ⏱️  Durée avant erreur: ${requestDuration}ms`);
        console.error(`[API] 🔍 Code erreur: ${error.code || 'N/A'}`);
        
        if (isTimeout) {
          console.error(`[API] ⚠️  TIMEOUT: Le serveur n'a pas répondu dans les 30 secondes`);
          console.error(`[API] 💡 Vérifiez que le serveur backend est démarré sur ${API_BASE_URL}`);
        }
        if (isNetworkError) {
          console.error(`[API] ⚠️  ERREUR RÉSEAU: Impossible de se connecter au serveur`);
          console.error(`[API] 💡 Vérifiez que le serveur est démarré et accessible`);
        }
        if (isConnectionError && !isTimeout) {
          console.error(`[API] ⚠️  CONNEXION INTERROMPUE: La connexion a été interrompue`);
        }
      }

      // Si l'API retourne une StandardResponse dans error.response.data
      if (error.response?.data && typeof error.response.data === 'object' && 'success' in error.response.data) {
        return error.response.data as StandardResponse<T>;
      }

      // Sinon, créer une StandardResponse d'erreur
      const statusCode = error.response?.status || 500;
      let message = error.response?.data?.message || error.message || 'Une erreur réseau est survenue';
      
      if (isTimeout) {
        message = `L'API ne répond pas (timeout après 30s). Vérifiez que le serveur est démarré sur ${API_BASE_URL}`;
      }
      
      return {
        statusCode,
        success: false,
        message,
        data: null,
      };
    }

    // Erreur inconnue
    if (__DEV__) {
      console.error(`[API] ❌ Erreur inconnue:`, error);
    }

    return {
      statusCode: 500,
      success: false,
      message: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
      data: null,
    };
  }
}

/**
 * Teste la connexion à l'API
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (__DEV__) {
      console.log(`[API] 🧪 Test de connexion vers: ${API_BASE_URL}/health`);
    }
    const response = await apiClient<{ status: string }>('GET', '/health');
    if (__DEV__) {
      console.log(`[API] ✅ Connexion réussie:`, response);
    }
    return response.success && response.statusCode === 200;
  } catch (error) {
    console.error('[API] ❌ Erreur de connexion:', error);
    return false;
  }
}
