/**
 * @deprecated Utilisez src/config/runtime.ts à la place
 * Conservé pour compatibilité
 */
import { apiBaseUrl } from './runtime';

export const getApiBaseUrl = () => apiBaseUrl;

// Log au démarrage
if (__DEV__) {
  console.log("API BASE URL =", getApiBaseUrl());
}

