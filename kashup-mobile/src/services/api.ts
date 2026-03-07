/**
 * Client API centralisé pour communiquer avec kashup-api
 * Détection automatique de l'IP du serveur Expo via Constants
 * Gère l'authentification JWT, le refresh token automatique, et le format StandardResponse
 * Stockage : SecureStore + fallback AsyncStorage (Expo Go / certains appareils)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '../config/api';
import { ApiError, StandardResponse, unwrapStandardResponse } from '../types/api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kashup_access_token',
  REFRESH_TOKEN: 'kashup_refresh_token',
} as const;

const API_BASE_URL = getApiBaseUrl();
let axiosInstance: AxiosInstance | null = null;

/** Appelé quand la session est invalidée (401 + clear token). Permet à AuthContext de mettre user à null. */
let onSessionInvalidated: (() => void) | null = null;
export function setOnSessionInvalidated(callback: (() => void) | null): void {
  onSessionInvalidated = callback;
}

async function getItemSecure(key: string): Promise<string | null> {
  try {
    let value = await SecureStore.getItemAsync(key);
    if (value != null && value.trim() !== '') return value;
    value = await AsyncStorage.getItem(key);
    if (value != null && value.trim() !== '') {
      await SecureStore.setItemAsync(key, value);
      return value;
    }
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[api] getItem', key, e);
    return null;
  }
}

async function setItemSecure(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    if (__DEV__) console.warn('[api] setItem', key, e);
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e2) {
      throw e;
    }
  }
}

async function removeItemSecure(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getAuthToken(): Promise<string | null> {
  return getItemSecure(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await setItemSecure(STORAGE_KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItemSecure(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  await setItemSecure(STORAGE_KEYS.REFRESH_TOKEN, token);
}

export async function hasRefreshToken(): Promise<boolean> {
  const token = await getRefreshToken();
  return token != null && token.trim() !== '';
}

export async function clearAuthToken(): Promise<void> {
  await Promise.all([
    removeItemSecure(STORAGE_KEYS.ACCESS_TOKEN),
    removeItemSecure(STORAGE_KEYS.REFRESH_TOKEN),
  ]);
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
    }>>(
      refreshUrl,
      { refreshToken: refreshTokenValue },
      { headers: { 'Content-Type': 'application/json' } }
    );

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
      timeout: 60000, // 60 s (cold start Vercel peut dépasser 30 s)
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur de requête : ajoute le token (refresh proactif si accès manquant mais refresh dispo)
    axiosInstance.interceptors.request.use(
      async (config) => {
        let token = await getAuthToken();
        if (!token?.trim()) {
          const refreshTokenValue = await getRefreshToken();
          if (refreshTokenValue?.trim()) {
            try {
              await refreshToken();
              token = await getAuthToken();
            } catch {
              // Laisser partir la requête sans token ; le backend renverra 401 puis l’intercepteur réponse gèrera
            }
          }
        }
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

          const refreshTokenValue = await getRefreshToken();
          if (!refreshTokenValue) {
            // Pas de refresh token (non connecté ou session expirée) : ne pas appeler refreshToken()
            // pour éviter le message "Aucun refresh token disponible"
            await clearAuthToken();
            onSessionInvalidated?.();
            return Promise.reject(
              Object.assign(error, {
                response: {
                  ...error.response,
                  data: {
                    ...(error.response?.data as object),
                    message: 'Session expirée ou non connecté',
                  },
                },
              })
            );
          }

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
            onSessionInvalidated?.();
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
      const status = error.response?.status;
      const is401 = status === 401;

      const requestDuration = Date.now() - requestStartTime;
      const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND';
      const isConnectionError = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

      // 4xx (401, 400, etc.) → console.warn pour ne pas déclencher l'écran d'erreur rouge (l'utilisateur voit l'alerte avec le message)
      const is4xx = status != null && status >= 400 && status < 500;
      const logFn = __DEV__ && (is401 || is4xx) ? console.warn : (__DEV__ ? console.error : () => {});
      if (__DEV__) {
        logFn(`[API] ${is401 ? '⚠️' : '❌'} ${method} ${endpoint} → ${is401 ? '401 Non autorisé' : 'Erreur'}`);
        logFn(`[API] 🔗 URL tentée: ${fullUrl}`);
        logFn(`[API] 📊 Status: ${status || 'N/A'}`);
        if (!is401) {
          logFn(`[API] ⚠️  Type: ${isTimeout ? 'TIMEOUT' : isNetworkError ? 'RÉSEAU' : 'AUTRE'}`);
          logFn(`[API] 💬 Message: ${error.message}`);
          logFn(`[API] ⏱️  Durée avant erreur: ${requestDuration}ms`);
          logFn(`[API] 🔍 Code erreur: ${error.code || 'N/A'}`);
        }
        if (isTimeout) {
          logFn(`[API] ⚠️  TIMEOUT: Le serveur n'a pas répondu dans les 30 secondes`);
          logFn(`[API] 💡 Vérifiez que le serveur backend est démarré sur ${API_BASE_URL}`);
        }
        if (isNetworkError) {
          logFn(`[API] ⚠️  ERREUR RÉSEAU: Impossible de se connecter au serveur`);
          logFn(`[API] 💡 Vérifiez que le serveur est démarré et accessible`);
        }
        if (isConnectionError && !isTimeout) {
          logFn(`[API] ⚠️  CONNEXION INTERROMPUE: La connexion a été interrompue`);
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
        message = `Le serveur met trop de temps à répondre. Vérifiez votre connexion internet et réessayez.`;
      } else if (isNetworkError || error.message === 'Network Error') {
        message = `Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.`;
      } else if (isConnectionError) {
        message = `Connexion interrompue. Vérifiez votre connexion internet et réessayez.`;
      }

      return {
        statusCode,
        success: false,
        message,
        data: null,
      };
    }

    // Erreur inconnue (ne pas afficher en rouge si c'est "aucun refresh token" — utilisateur non connecté)
    const isNoRefreshToken =
      error instanceof ApiError &&
      (error.statusCode === 401 || /refresh token/i.test(error.message));
    if (__DEV__ && !isNoRefreshToken) {
      console.error(`[API] ❌ Erreur inconnue:`, error);
    }

    const statusCode = error instanceof ApiError ? error.statusCode : 500;
    return {
      statusCode,
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
