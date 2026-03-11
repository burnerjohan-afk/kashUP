/**
 * Configuration centralisée de l'API
 * Base URL et paramètres globaux
 * 
 * ⚠️ ARCHITECTURE: Détection dynamique de l'IP LAN via /api/v1/debug/network
 * 
 * CONVENTION:
 * - VITE_API_BASE_URL: URL complète avec /api/v1 (ex: http://localhost:4000/api/v1)
 * - VITE_API_URL: URL de base sans /api/v1 (ex: http://localhost:4000) - pour compatibilité
 * 
 * L'admin utilise toujours les routes /api/v1 pour toutes les ressources
 * L'IP LAN est détectée dynamiquement au runtime (⚠️ AUCUNE IP CODÉE EN DUR)
 */

// URL de fallback pour la détection réseau
const getFallbackURL = (): string => {
  // Priorité 1: VITE_API_BASE_URL (recommandé)
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (envBaseUrl) {
    const url = envBaseUrl.trim().replace(/\/$/, '');
    // Si l'URL contient déjà /api/v1, retirer pour obtenir l'origine
    if (url.includes('/api/v1')) {
      return url.replace(/\/api\/v1\/?$/, '');
    }
    return url;
  }
  
  // Priorité 2: VITE_API_URL (pour compatibilité)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.trim().replace(/\/$/, '');
  }
  
  // Fallback par défaut
  return 'http://localhost:4000';
};

// URL de base statique (fallback) - sera remplacée par la détection dynamique
const getStaticBaseURL = (): string => {
  const fallback = getFallbackURL();
  return `${fallback}/api/v1`;
};

/**
 * URL de base sans /api/v1 (pour les images, uploads, etc.)
 */
const getBaseOrigin = (): string => {
  return getFallbackURL();
};

export const API_CONFIG = {
  // URL statique de fallback (sera remplacée par la détection dynamique)
  baseURL: getStaticBaseURL(),
  baseOrigin: getBaseOrigin(),
  fallbackURL: getFallbackURL(),
  timeout: 30000, // 30 secondes (client)
  serverTimeout: 25000, // 25 secondes (serveur)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// Log en développement
if (import.meta.env.DEV) {
  console.log('🔧 Configuration API:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    baseURL: API_CONFIG.baseURL,
    baseOrigin: API_CONFIG.baseOrigin,
    mode: import.meta.env.MODE,
  });
}

