/**
 * Service pour enregistrer le token Expo Push auprès du backend
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

/**
 * Enregistre le token Expo Push auprès du backend
 * 
 * @param token - Le token Expo Push à enregistrer
 */
export async function registerPushToken(token: string): Promise<void> {
  try {
    const response = await apiClient('POST', '/me/push-token', {
      token,
      platform: 'expo',
    });
    unwrapStandardResponse(response);
    console.log('[NotificationTokenService] Token enregistré avec succès');
  } catch (error) {
    console.error('[NotificationTokenService] Erreur lors de l\'enregistrement du token:', error);
    // Ne pas throw pour ne pas bloquer l'application si l'enregistrement échoue
  }
}

/**
 * Supprime le token Expo Push du backend
 * 
 * @param token - Le token Expo Push à supprimer
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const response = await apiClient('DELETE', '/me/push-token', { token });
    unwrapStandardResponse(response);
    console.log('[NotificationTokenService] Token supprimé avec succès');
  } catch (error) {
    console.error('[NotificationTokenService] Erreur lors de la suppression du token:', error);
  }
}

