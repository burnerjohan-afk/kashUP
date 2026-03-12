import ky from 'ky';
import type { ApiResponse, StandardResponse } from '@/types/api';
import type { AdminUser } from '@/types/auth';
import { useAuthStore } from '@/store/auth-store';
import { unwrapStandardResponse } from './response';
import { API_CONFIG } from '@/config/api';

// Utiliser la configuration centralisée
const API_BASE_URL = API_CONFIG.baseURL;

const authHeaders = () => {
  const { accessToken } = useAuthStore.getState();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

// 🔒 SÉCURITÉ: Récupérer le token CSRF depuis le meta tag ou sessionStorage
const getCSRFToken = (): string | null => {
  // Essayer de récupérer depuis le meta tag (si présent dans le HTML)
  if (typeof document !== 'undefined') {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Essayer de récupérer depuis sessionStorage (si stocké par le backend)
    try {
      return sessionStorage.getItem('csrf-token');
    } catch {
      return null;
    }
  }
  return null;
};

const refreshSession = async () => {
  const { refreshToken, setCredentials, clearSession, user } = useAuthStore.getState();
  
  if (!refreshToken) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Aucun refresh token disponible - session expirée ou non authentifiée');
    }
    clearSession();
    return null;
  }
  
  if (!user) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Aucun utilisateur dans le store - session invalide');
    }
    clearSession();
    return null;
  }

  try {
    if (import.meta.env.DEV) {
      console.log('🔄 Tentative de rafraîchissement du token...');
    }
    
    const response = await ky
      .post(`${API_BASE_URL}/auth/refresh`, {
        json: { refreshToken },
        timeout: 10000, // 10 secondes pour le refresh
      })
      .json<StandardResponse<{ user: AdminUser; tokens: { accessToken: string; refreshToken: string } }>>();

    if (response.success && response.data) {
      // Transformer le format pour correspondre à ce que le store attend
      const transformed = {
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        user: response.data.user,
      };
      setCredentials(transformed);
      
      if (import.meta.env.DEV) {
        console.log('✅ Token rafraîchi avec succès');
      }
      
      return transformed.accessToken;
    } else {
      if (import.meta.env.DEV) {
        console.error('❌ Échec du rafraîchissement du token:', response.message);
      }
      clearSession();
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors du rafraîchissement du token:', {
        error: error instanceof Error ? error.message : String(error),
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
      });
    }
    clearSession();
  }

  return null;
};

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30000, // 30 secondes de timeout
  retry: {
    limit: 2,
    methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
  // NE PAS définir Content-Type par défaut ici pour éviter les conflits avec FormData
  // Le Content-Type sera ajouté automatiquement par ky pour les requêtes JSON
  // et laissé au navigateur pour les requêtes FormData
  hooks: {
    beforeRequest: [
      (request) => {
        const headers = authHeaders();
        Object.entries(headers).forEach(([key, value]) => {
          request.headers.set(key, value);
        });

        // 🔒 SÉCURITÉ: Ajouter le token CSRF pour les méthodes modifiantes
        const csrfToken = getCSRFToken();
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
          request.headers.set('X-CSRF-Token', csrfToken);
        }

        // Toujours indiquer qu'on parle JSON côté client
        if (!request.headers.has('Accept')) {
          request.headers.set('Accept', 'application/json');
        }

        // Si le body est un FormData, s'assurer qu'aucun Content-Type n'est défini
        // Le navigateur définira automatiquement le Content-Type avec le boundary
        if (request.body instanceof FormData) {
          request.headers.delete('Content-Type');
          if (import.meta.env.DEV) {
            console.log('📤 Requête FormData - Content-Type supprimé, le navigateur le définira automatiquement');
          }
        } else if (request.body && typeof request.body === 'object' && !(request.body instanceof FormData)) {
          // Pour les requêtes JSON, ajouter le Content-Type si ce n'est pas déjà fait
          if (!request.headers.has('Content-Type')) {
            request.headers.set('Content-Type', 'application/json');
          }
          // Convertir explicitement en JSON string si ce n'est pas déjà fait
          // (ky s'en charge quand on utilise l'option json, mais par sécurité
          // pour les appels qui passeraient un body objet brut)
          const originalBody = request.body;
          try {
            const clonedBody = originalBody as unknown;
            // @ts-expect-error force BodyInit
            request.body = JSON.stringify(clonedBody);
          } catch {
            // Si on ne peut pas stringify, on laisse ky gérer/échouer
          }
        }

        if (import.meta.env.DEV) {
          console.log('📤 Requête API:', {
            method: request.method,
            url: request.url,
            hasAuth: !!headers.Authorization,
            hasCSRF: !!csrfToken,
            contentType: request.headers.get('Content-Type'),
            accept: request.headers.get('Accept'),
            isFormData: request.body instanceof FormData,
          });
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        // 🔒 SÉCURITÉ: Récupérer et stocker le token CSRF depuis les headers de réponse
        const csrfToken = response.headers.get('X-CSRF-Token');
        if (csrfToken) {
          try {
            sessionStorage.setItem('csrf-token', csrfToken);
          } catch {
            // Ignorer si sessionStorage n'est pas disponible
          }
        }
        
        // Log des réponses en développement
        if (import.meta.env.DEV && response.status >= 400) {
          try {
            const clonedResponse = response.clone();
            // Vérifier que la réponse est bien du JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await clonedResponse.json().catch(() => null);
              console.error('⚠️ Erreur HTTP:', {
                status: response.status,
                statusText: response.statusText,
                url: request.url,
                errorData,
              });
            } else {
              // Réponse non-JSON
              const text = await clonedResponse.text().catch(() => 'Impossible de lire la réponse');
              console.error('⚠️ Erreur HTTP (réponse non-JSON):', {
                status: response.status,
                statusText: response.statusText,
                url: request.url,
                contentType,
                body: text.substring(0, 200), // Limiter à 200 caractères
              });
            }
          } catch (error) {
            // Ignorer si on ne peut pas parser
            if (import.meta.env.DEV) {
              console.error('⚠️ Impossible de lire la réponse d\'erreur:', error);
            }
          }
        }
        
        if (response.status !== 401 || request.headers.has('x-refresh-attempted')) {
          return;
        }

        request.headers.set('x-refresh-attempted', 'true');
        const newToken = await refreshSession();
        if (!newToken) return;

        request.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(request);
      },
    ],
  },
});

export const getJson = async <T>(input: string, searchParams?: Record<string, string | number | boolean>) => {
  try {
    const response = await apiClient.get(input, { searchParams });
    return response.json<ApiResponse<T>>();
  } catch (error) {
    // Gérer les erreurs de réseau
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        // Retourner une réponse avec l'erreur pour que unwrapResponse puisse la gérer
        return {
          data: undefined as unknown as T,
          error: {
            message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible sur http://localhost:4000',
            code: 'NETWORK_ERROR',
          },
        };
      }
      // Si c'est une HTTPError de ky, essayer d'extraire le message d'erreur
      if ('response' in err && err.response) {
        // Vérifier que la réponse est bien du JSON
        const contentType = err.response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await err.response.json();
            // Vérifier le format de réponse de l'API { data, error, meta }
            if (errorData.error) {
              // Retourner une réponse avec l'erreur pour que unwrapResponse puisse la gérer
              return {
                data: undefined as unknown as T,
                error: {
                  message: errorData.error.message || err.message || 'Erreur serveur',
                  code: errorData.error.code || err.response.status.toString(),
                  details: errorData.error.details,
                },
              };
            }
            // Si pas de format { error }, mais que la réponse n'est pas OK
            return {
              data: undefined as unknown as T,
              error: {
                message: errorData.message || err.message || `Erreur HTTP ${err.response.status}`,
                code: err.response.status.toString(),
                details: errorData,
              },
            };
          } catch (parseError) {
            // Si on ne peut pas parser le JSON, créer une erreur générique
            if (import.meta.env.DEV) {
              console.error('❌ Impossible de parser la réponse JSON:', parseError);
            }
            return {
              data: undefined as unknown as T,
              error: {
                message: err.message || `Erreur HTTP ${err.response.status}`,
                code: err.response.status.toString(),
              },
            };
          }
        } else {
          // Réponse non-JSON - essayer de lire le texte
          try {
            const text = await err.response.text();
            if (import.meta.env.DEV) {
              console.error('❌ Réponse non-JSON reçue:', {
                contentType,
                status: err.response.status,
                body: text.substring(0, 200),
              });
            }
            return {
              data: undefined as unknown as T,
              error: {
                message: text || err.message || `Erreur HTTP ${err.response.status}`,
                code: err.response.status.toString(),
                details: text.length > 200 ? text.substring(200) : undefined,
              },
            };
          } catch {
            return {
              data: undefined as unknown as T,
              error: {
                message: err.message || `Erreur HTTP ${err.response.status}`,
                code: err.response.status.toString(),
              },
            };
          }
        }
      }
    }
    throw error;
  }
};

export const postJson = async <T, B extends object = object>(input: string, body?: B) => {
  try {
    const response = await apiClient.post(input, { json: body });
    const jsonResponse = await response.json<ApiResponse<T>>();
    
    if (import.meta.env.DEV) {
      console.log('📡 Réponse POST:', {
        endpoint: input,
        status: response.status,
        hasData: !!jsonResponse.data,
        hasError: !!jsonResponse.error,
        error: jsonResponse.error,
      });
    }
    
    return jsonResponse;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur POST:', {
        endpoint: input,
        error,
        errorType: error?.constructor?.name,
      });
    }
    
    // Gérer les erreurs de réseau
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        // Retourner une réponse avec l'erreur pour que unwrapResponse puisse la gérer
        return {
          data: undefined as unknown as T,
          error: {
            message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible sur http://localhost:4000',
            code: 'NETWORK_ERROR',
          },
        };
      }
      // Si c'est une HTTPError de ky, essayer d'extraire le message d'erreur
      if ('response' in err && err.response) {
        try {
          const errorData = await err.response.json();
          
          if (import.meta.env.DEV) {
            console.error('📥 Erreur HTTP détaillée:', {
              status: err.response.status,
              statusText: err.response.statusText,
              errorData,
            });
          }
          
          if (errorData.error) {
            // Retourner une réponse avec l'erreur pour que unwrapResponse puisse la gérer
            return {
              data: undefined as unknown as T,
              error: {
                message: errorData.error.message || err.message || 'Erreur serveur',
                code: errorData.error.code || err.response.status.toString(),
                details: errorData.error.details,
              },
            };
          }
          
          // Si l'API retourne directement un message d'erreur (pas dans error)
          if (errorData.message) {
            return {
              data: undefined as unknown as T,
              error: {
                message: errorData.message,
                code: err.response.status.toString(),
              },
            };
          }
        } catch (parseError) {
          // Si on ne peut pas parser le JSON, créer une erreur générique
          if (import.meta.env.DEV) {
            console.error('❌ Impossible de parser l\'erreur:', parseError);
          }
          return {
            data: undefined as unknown as T,
            error: {
              message: err.message || `Erreur HTTP ${err.response.status}`,
              code: err.response.status.toString(),
            },
          };
        }
      }
    }
    throw error;
  }
};

/** Timeout plus long pour les uploads (vidéos, images) — 90 s */
const UPLOAD_TIMEOUT_MS = 90_000;

export const postFormData = async <T>(input: string, body: FormData) => {
  try {
    // IMPORTANT: Ne pas passer de headers Content-Type, ky le définira automatiquement avec le bon boundary
    // Le hook beforeRequest supprimera le header par défaut 'application/json'
    const response = await apiClient.post(input, {
      body,
      timeout: UPLOAD_TIMEOUT_MS,
      // Ne pas définir de headers ici, ky gérera automatiquement le Content-Type pour FormData
    });
    return response.json<ApiResponse<T>>();
  } catch (error) {
    // Si c'est une HTTPError de ky, essayer d'extraire le message d'erreur
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as { response?: Response; message?: string };
      if (httpError.response) {
        try {
          const errorData = await httpError.response.json();
          // Log détaillé en développement pour les erreurs 500
          if (import.meta.env.DEV && httpError.response.status === 500) {
            console.error('🔴 Erreur 500 du serveur - Réponse complète:', {
              url: input,
              status: httpError.response.status,
              statusText: httpError.response.statusText,
              fullErrorData: errorData,
              errorMessage: errorData?.error?.message,
              errorCode: errorData?.error?.code,
              errorDetails: errorData?.error?.details,
              // Afficher aussi les autres propriétés au cas où
              allKeys: Object.keys(errorData || {}),
            });
          }
          if (errorData.error) {
            // Retourner une réponse avec l'erreur pour que unwrapResponse puisse la gérer
            return {
              data: undefined as unknown as T,
              error: {
                message: errorData.error.message || httpError.message || 'Erreur serveur',
                code: errorData.error.code || httpError.response.status.toString(),
                details: errorData.error.details,
              },
            };
          }
        } catch (parseError) {
          // Si on ne peut pas parser le JSON, essayer de lire le texte
          try {
            const errorText = await httpError.response.clone().text();
            if (import.meta.env.DEV) {
              console.error('🔴 Erreur 500 (réponse non-JSON):', {
                url: input,
                status: httpError.response.status,
                statusText: httpError.response.statusText,
                body: errorText.substring(0, 500), // Limiter à 500 caractères
              });
            }
            // Retourner une réponse avec l'erreur
            return {
              data: undefined as unknown as T,
              error: {
                message: errorText || httpError.message || `Erreur HTTP ${httpError.response.status}`,
                code: httpError.response.status.toString(),
                details: errorText.length > 500 ? errorText.substring(500) : undefined,
              },
            };
          } catch {
            // Si on ne peut pas lire le texte non plus, créer une erreur générique
            if (import.meta.env.DEV) {
              console.error('🔴 Erreur 500 (impossible de lire la réponse):', {
                url: input,
                status: httpError.response.status,
                statusText: httpError.response.statusText,
              });
            }
            return {
              data: undefined as unknown as T,
              error: {
                message: httpError.message || `Erreur HTTP ${httpError.response.status}: ${httpError.response.statusText}`,
                code: httpError.response.status.toString(),
              },
            };
          }
        }
      }
    }
    throw error;
  }
};

export const patchFormData = async <T>(input: string, body: FormData) => {
  // IMPORTANT: Ne pas passer de headers Content-Type, ky le définira automatiquement avec le bon boundary
  // Le hook beforeRequest supprimera le header par défaut 'application/json'
  const response = await apiClient.patch(input, {
    body,
    timeout: UPLOAD_TIMEOUT_MS,
    // Ne pas définir de headers ici, ky gérera automatiquement le Content-Type pour FormData
  });
  return response.json<ApiResponse<T>>();
};

export const patchJson = async <T, B extends object = object>(input: string, body?: B) => {
  const response = await apiClient.patch(input, { json: body });
  return response.json<ApiResponse<T>>();
};

export const putJson = async <T, B extends object = object>(input: string, body?: B) => {
  const response = await apiClient.put(input, { json: body });
  return response.json<ApiResponse<T>>();
};

export const deleteStandardJson = async (input: string): Promise<StandardResponse<null>> => {
  try {
    const response = await apiClient.delete(input);
    const jsonResponse = await response.json<StandardResponse<null>>();
    
    if (import.meta.env.DEV) {
      console.log('📡 Réponse DELETE (StandardResponse):', {
        endpoint: input,
        statusCode: jsonResponse.statusCode,
        success: jsonResponse.success,
      });
    }
    
    return jsonResponse;
  } catch (error) {
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        return {
          statusCode: 0,
          success: false,
          message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible.',
          data: null,
        };
      }
      if ('response' in err && err.response) {
        const contentType = err.response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await err.response.json();
            if ('statusCode' in errorData && 'success' in errorData) {
              return errorData as StandardResponse<null>;
            }
            return {
              statusCode: err.response.status,
              success: false,
              message: err.message || `Erreur HTTP ${err.response.status}`,
              data: null,
            };
          } catch {
            // Ignorer
          }
        }
        return {
          statusCode: err.response.status,
          success: false,
          message: err.message || `Erreur HTTP ${err.response.status}`,
          data: null,
        };
      }
    }
    throw error;
  }
};

export const deleteJson = async <T>(input: string) => {
  const response = await apiClient.delete(input);
  return response.json<ApiResponse<T>>();
};

export const downloadFile = async (input: string, searchParams?: Record<string, string | number | boolean>) => {
  const response = await apiClient.get(input, { searchParams });
  return response.blob();
};

// ============================================================================
// NOUVELLES FONCTIONS POUR LE FORMAT STANDARDISÉ (kashup-api)
// ============================================================================

/**
 * Filtre les paramètres de query pour ne pas envoyer les valeurs vides
 * Ne pas envoyer: undefined, null, '', 'all' (pour territory)
 */
const cleanSearchParams = (params?: Record<string, string | number | boolean | undefined | null>): Record<string, string | number | boolean> => {
  if (!params) return {};
  
  const cleaned: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    // Ignorer undefined, null, chaînes vides
    if (value === undefined || value === null || value === '') {
      return;
    }
    // Ignorer 'all' pour territory (mais pas pour les autres champs)
    if (key === 'territory' && value === 'all') {
      return;
    }
    cleaned[key] = value;
  });
  return cleaned;
};

/**
 * GET avec le nouveau format StandardResponse
 * Utilise le format { statusCode, success, message, data, meta }
 */
export const getStandardJson = async <T>(
  input: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>
): Promise<StandardResponse<T>> => {
  try {
    const cleanedParams = cleanSearchParams(searchParams);
    const response = await apiClient.get(input, { searchParams: cleanedParams });
    const jsonResponse = await response.json<StandardResponse<T>>();
    
    if (import.meta.env.DEV) {
      console.log('📡 Réponse GET (StandardResponse):', {
        endpoint: input,
        statusCode: jsonResponse.statusCode,
        success: jsonResponse.success,
        hasData: !!jsonResponse.data,
        hasPagination: !!jsonResponse.meta?.pagination,
      });
    }
    
    return jsonResponse;
  } catch (error) {
    // Gérer les erreurs de réseau
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        return {
          statusCode: 0,
          success: false,
          message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible.',
          data: null,
        };
      }
      // Si c'est une HTTPError de ky, essayer d'extraire le message d'erreur
      if ('response' in err && err.response) {
        const contentType = err.response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await err.response.json();
            // Si c'est déjà un StandardResponse, le retourner
            if ('statusCode' in errorData && 'success' in errorData) {
              return errorData as StandardResponse<T>;
            }
            // Sinon, convertir en StandardResponse
            // Extraire un message d'erreur plus lisible pour les erreurs Prisma
            let errorMessage = errorData.message || err.message || `Erreur HTTP ${err.response.status}`;
            
            // Si c'est une erreur Prisma, améliorer le message
            if (errorMessage.includes('Prisma') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
              const columnMatch = errorMessage.match(/column `([^`]+)` does not exist/);
              if (columnMatch) {
                const columnName = columnMatch[1];
                errorMessage = `Erreur de base de données : la colonne "${columnName}" n'existe pas dans la base de données. Veuillez contacter l'administrateur pour mettre à jour le schéma.`;
              } else if (errorMessage.includes('Invalid `prisma')) {
                errorMessage = 'Erreur de base de données : problème de schéma Prisma. Le backend doit être mis à jour.';
              }
            }
            
            return {
              statusCode: err.response.status,
              success: false,
              message: errorMessage,
              data: null,
              meta: errorData.meta || { details: errorData },
            };
          } catch (parseError) {
            if (import.meta.env.DEV) {
              console.error('❌ Impossible de parser la réponse JSON:', parseError);
            }
          }
        }
        return {
          statusCode: err.response.status,
          success: false,
          message: err.message || `Erreur HTTP ${err.response.status}`,
          data: null,
        };
      }
    }
    throw error;
  }
};

/**
 * POST avec le nouveau format StandardResponse
 * Détecte automatiquement si body est FormData ou JSON
 */
export const postStandardJson = async <T>(
  input: string,
  body?: FormData | object
): Promise<StandardResponse<T>> => {
  try {
    const isFormData = body instanceof FormData;
    const response = await apiClient.post(input, isFormData ? { body } : { json: body });
    const jsonResponse = await response.json<StandardResponse<T>>();
    
    if (import.meta.env.DEV) {
      console.log('📡 Réponse POST (StandardResponse):', {
        endpoint: input,
        statusCode: jsonResponse.statusCode,
        success: jsonResponse.success,
        hasData: !!jsonResponse.data,
        isFormData,
      });
    }
    
    return jsonResponse;
  } catch (error) {
    // Gérer les erreurs de réseau
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        return {
          statusCode: 0,
          success: false,
          message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible.',
          data: null,
        };
      }
      if ('response' in err && err.response) {
        const contentType = err.response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await err.response.json();
            if ('statusCode' in errorData && 'success' in errorData) {
              return errorData as StandardResponse<T>;
            }
            // Extraire un message d'erreur plus lisible pour les erreurs Prisma
            let errorMessage = errorData.message || err.message || `Erreur HTTP ${err.response.status}`;
            
            // Si c'est une erreur Prisma, améliorer le message
            if (errorMessage.includes('Prisma') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
              const columnMatch = errorMessage.match(/column `([^`]+)` does not exist/);
              if (columnMatch) {
                const columnName = columnMatch[1];
                errorMessage = `Erreur de base de données : la colonne "${columnName}" n'existe pas dans la base de données. Veuillez contacter l'administrateur pour mettre à jour le schéma.`;
              } else if (errorMessage.includes('Invalid `prisma')) {
                errorMessage = 'Erreur de base de données : problème de schéma Prisma. Le backend doit être mis à jour.';
              }
            }
            
            return {
              statusCode: err.response.status,
              success: false,
              message: errorMessage,
              data: null,
              meta: errorData.meta || { details: errorData },
            };
          } catch (parseError) {
            if (import.meta.env.DEV) {
              console.error('❌ Impossible de parser l\'erreur:', parseError);
            }
          }
        }
        return {
          statusCode: err.response.status,
          success: false,
          message: err.message || `Erreur HTTP ${err.response.status}`,
          data: null,
        };
      }
    }
    throw error;
  }
};

/**
 * PATCH avec le nouveau format StandardResponse
 * Détecte automatiquement si body est FormData ou JSON
 */
export const patchStandardJson = async <T>(
  input: string,
  body?: FormData | object
): Promise<StandardResponse<T>> => {
  try {
    const isFormData = body instanceof FormData;
    const response = await apiClient.patch(input, isFormData ? { body } : { json: body });
    const jsonResponse = await response.json<StandardResponse<T>>();
    
    if (import.meta.env.DEV) {
      console.log('📡 Réponse PATCH (StandardResponse):', {
        endpoint: input,
        statusCode: jsonResponse.statusCode,
        success: jsonResponse.success,
        hasData: !!jsonResponse.data,
        isFormData,
      });
    }
    
    return jsonResponse;
  } catch (error) {
    // Même gestion d'erreur que postStandardJson
    if (error && typeof error === 'object' && 'message' in error) {
      const err = error as { message?: string; response?: Response };
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        return {
          statusCode: 0,
          success: false,
          message: 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible.',
          data: null,
        };
      }
      if ('response' in err && err.response) {
        const contentType = err.response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await err.response.json();
            if ('statusCode' in errorData && 'success' in errorData) {
              return errorData as StandardResponse<T>;
            }
            // Extraire un message d'erreur plus lisible pour les erreurs Prisma
            let errorMessage = errorData.message || err.message || `Erreur HTTP ${err.response.status}`;
            
            // Si c'est une erreur Prisma, améliorer le message
            if (errorMessage.includes('Prisma') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
              const columnMatch = errorMessage.match(/column `([^`]+)` does not exist/);
              if (columnMatch) {
                const columnName = columnMatch[1];
                errorMessage = `Erreur de base de données : la colonne "${columnName}" n'existe pas dans la base de données. Veuillez contacter l'administrateur pour mettre à jour le schéma.`;
              } else if (errorMessage.includes('Invalid `prisma')) {
                errorMessage = 'Erreur de base de données : problème de schéma Prisma. Le backend doit être mis à jour.';
              }
            }
            
            return {
              statusCode: err.response.status,
              success: false,
              message: errorMessage,
              data: null,
              meta: errorData.meta || { details: errorData },
            };
          } catch {
            // Ignorer
          }
        }
        return {
          statusCode: err.response.status,
          success: false,
          message: err.message || `Erreur HTTP ${err.response.status}`,
          data: null,
        };
      }
    }
    throw error;
  }
};

// Fonction utilitaire pour tester la connexion à l'API
export const testApiConnection = async () => {
  try {
    if (import.meta.env.DEV) {
      console.log('🔍 Test de connexion à l\'API:', API_BASE_URL);
    }
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json().catch(() => ({ status: 'unknown' }));
    
    if (import.meta.env.DEV) {
      console.log('✅ API accessible:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });
    }
    
    return {
      accessible: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ API non accessible:', {
        url: `${API_BASE_URL}/health`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      accessible: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

