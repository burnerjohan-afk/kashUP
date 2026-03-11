/**
 * Détection dynamique de l'IP LAN via l'API
 * Utilise GET /api/v1/debug/network pour obtenir l'IP dynamiquement
 * ⚠️ AUCUNE IP CODÉE EN DUR
 */

export interface NetworkInfo {
  ipv4: string;
  port: number;
  basePath: string;
  origins: string[];
}

let cachedNetworkInfo: NetworkInfo | null = null;
let networkDetectionPromise: Promise<NetworkInfo> | null = null;

/**
 * Détecte l'IP LAN et les informations réseau via l'API
 * @param fallbackUrl - URL de fallback si la détection échoue (ex: http://localhost:4000)
 * @returns Informations réseau avec IP LAN détectée
 */
export const detectNetworkInfo = async (
  fallbackUrl: string = 'http://localhost:4000'
): Promise<NetworkInfo> => {
  // Si déjà en cache, retourner immédiatement
  if (cachedNetworkInfo) {
    return cachedNetworkInfo;
  }

  // Si une détection est déjà en cours, attendre son résultat
  if (networkDetectionPromise) {
    return networkDetectionPromise;
  }

  // Lancer la détection
  networkDetectionPromise = (async () => {
    try {
      // Extraire le protocole et le port du fallback
      const fallbackUrlObj = new URL(fallbackUrl);
      const protocol = fallbackUrlObj.protocol;
      const fallbackPort = fallbackUrlObj.port || (protocol === 'https:' ? '443' : '80');
      const fallbackHost = fallbackUrlObj.hostname;

      // Essayer d'abord avec le fallback pour obtenir les infos réseau
      const debugUrl = `${protocol}//${fallbackHost}:${fallbackPort}/api/v1/debug/network`;

      if (import.meta.env.DEV) {
        console.log('🔍 Détection de l\'IP LAN via:', debugUrl);
      }

      const response = await fetch(debugUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Pas d'authentification requise pour /debug/network
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Le format de réponse peut être { data: NetworkInfo } ou NetworkInfo directement
      const networkInfo: NetworkInfo = result.data || result;

      if (!networkInfo.ipv4 || !networkInfo.port) {
        throw new Error('Informations réseau incomplètes');
      }

      cachedNetworkInfo = networkInfo;

      if (import.meta.env.DEV) {
        console.log('✅ IP LAN détectée:', {
          ipv4: networkInfo.ipv4,
          port: networkInfo.port,
          basePath: networkInfo.basePath,
          origins: networkInfo.origins,
        });
      }

      return networkInfo;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Impossible de détecter l\'IP LAN, utilisation du fallback:', {
          error: error instanceof Error ? error.message : String(error),
          fallbackUrl,
        });
      }

      // En cas d'erreur, utiliser le fallback et extraire l'IP
      const fallbackUrlObj = new URL(fallbackUrl);
      const fallbackHost = fallbackUrlObj.hostname;
      const fallbackPort = parseInt(fallbackUrlObj.port || (fallbackUrlObj.protocol === 'https:' ? '443' : '80'), 10);

      // Si c'est localhost, essayer de détecter l'IP locale
      let detectedIp = fallbackHost;
      if (fallbackHost === 'localhost' || fallbackHost === '127.0.0.1') {
        // En développement, on peut utiliser localhost
        detectedIp = 'localhost';
      }

      const fallbackInfo: NetworkInfo = {
        ipv4: detectedIp,
        port: fallbackPort,
        basePath: '/api/v1',
        origins: [`http://${detectedIp}:${fallbackPort}`, `https://${detectedIp}:${fallbackPort}`],
      };

      cachedNetworkInfo = fallbackInfo;
      return fallbackInfo;
    } finally {
      networkDetectionPromise = null;
    }
  })();

  return networkDetectionPromise;
};

/**
 * Construit l'URL de base de l'API avec l'IP LAN détectée
 * @param fallbackUrl - URL de fallback si la détection échoue
 * @returns URL complète avec /api/v1
 */
export const getDynamicApiBaseUrl = async (
  fallbackUrl: string = 'http://localhost:4000'
): Promise<string> => {
  const networkInfo = await detectNetworkInfo(fallbackUrl);
  const protocol = fallbackUrl.startsWith('https') ? 'https' : 'http';
  return `${protocol}://${networkInfo.ipv4}:${networkInfo.port}${networkInfo.basePath}`;
};

/**
 * Réinitialise le cache des informations réseau
 * Utile pour forcer une nouvelle détection
 */
export const resetNetworkCache = (): void => {
  cachedNetworkInfo = null;
  networkDetectionPromise = null;
  if (import.meta.env.DEV) {
    console.log('🔄 Cache réseau réinitialisé');
  }
};

/**
 * Obtient les informations réseau en cache (sans nouvelle détection)
 * @returns Informations réseau en cache ou null
 */
export const getCachedNetworkInfo = (): NetworkInfo | null => {
  return cachedNetworkInfo;
};

