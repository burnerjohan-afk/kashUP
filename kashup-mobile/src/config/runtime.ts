/**
 * Configuration runtime pour l'API
 * Priorité : EXPO_PUBLIC_API_URL (.env) si défini, sinon détection via Expo hostUri
 * Pour un appareil physique : mettre l'IP du PC dans .env (ex: EXPO_PUBLIC_API_URL=http://192.168.1.10:4000)
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Extrait l'IP du host depuis Expo hostUri
 * Exemple: exp://192.168.1.19:8081 → 192.168.1.19
 * Sur émulateur Android : localhost/127.0.0.1 → 10.0.2.2 (hôte physique)
 */
export function getHostFromExpo(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.hostUri;

  let host: string;

  if (!hostUri) {
    if (__DEV__) {
      console.warn('[runtime] ⚠️ Expo hostUri introuvable, fallback localhost');
    }
    host = 'localhost';
  } else {
    // Extraire l'IP depuis l'URI (ex: exp://192.168.1.19:8081 → 192.168.1.19)
    const match = hostUri.match(/:\/\/([^:]+)/);
    host = match ? match[1] : hostUri.split(':')[0];
  }

  // Sur émulateur Android, localhost pointe vers l'émulateur, pas l'hôte
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    host = '10.0.2.2';
    if (__DEV__) {
      console.log('[runtime] 📱 Android emulator: utilisation de 10.0.2.2 pour joindre l\'API');
    }
  }

  if (__DEV__) {
    console.log(`[runtime] 📍 Host détecté: ${host} (depuis ${hostUri ?? 'fallback'})`);
  }

  return host;
}

/** URL de prod par défaut (APK / build sans EXPO_PUBLIC_API_URL) */
const DEFAULT_PRODUCTION_API = 'https://kashupv0.vercel.app';

/**
 * Construit l'origine et la base URL de l'API.
 * 1) EXPO_PUBLIC_API_URL (.env / eas.json) si défini
 * 2) En build standalone (__DEV__ = false), défaut = prod (évite 10.0.2.2 en 5G / téléphone réel)
 * 3) Sinon détection via Expo hostUri (dev avec Expo Go)
 */
function buildApiUrls(): { origin: string; baseUrl: string } {
  const envUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL)?.trim();
  if (envUrl) {
    const url = envUrl.replace(/\/+$/, '');
    if (url.toLowerCase().endsWith('/api/v1')) {
      return {
        origin: url.replace(/\/api\/v1\/?$/i, ''),
        baseUrl: url,
      };
    }
    if (__DEV__) {
      console.log('[runtime] 🔗 API depuis .env (EXPO_PUBLIC_API_URL):', url);
    }
    return {
      origin: url,
      baseUrl: `${url}/api/v1`,
    };
  }
  // Build standalone (APK) sans env → utiliser la prod par défaut (évite 10.0.2.2 en 5G / appareil réel)
  if (!__DEV__) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[runtime] ⚠️ EXPO_PUBLIC_API_URL non défini en build, utilisation de la prod par défaut');
    }
    return {
      origin: DEFAULT_PRODUCTION_API,
      baseUrl: `${DEFAULT_PRODUCTION_API}/api/v1`,
    };
  }
  const host = getHostFromExpo();
  const origin = `http://${host}:4000`;
  console.log('[runtime] 🔗 API Origin (auto):', origin);
  return {
    origin,
    baseUrl: `${origin}/api/v1`,
  };
}

const { origin: _apiOrigin, baseUrl: _apiBaseUrl } = buildApiUrls();

/**
 * Origine de l'API (sans /api/v1)
 * Exemple: http://192.168.1.19:4000
 */
export const apiOrigin = _apiOrigin;

/**
 * Base URL de l'API (avec /api/v1)
 * Exemple: http://192.168.1.19:4000/api/v1
 */
export const apiBaseUrl = _apiBaseUrl;

// Log au démarrage
if (__DEV__) {
  console.log(`[runtime] ✅ Configuration API chargée`);
  console.log(`[runtime] 📍 API Origin: ${apiOrigin}`);
  console.log(`[runtime] 📍 API Base URL: ${apiBaseUrl}`);
}

