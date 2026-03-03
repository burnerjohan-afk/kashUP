/**
 * Gestionnaire d'erreurs pour les appels API
 */

import { Alert, Platform } from 'react-native';
import { ApiError } from '../types/api';

/**
 * Formate une erreur API en message lisible
 */
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    // Si des erreurs de validation sont présentes, les formater
    if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
      const fieldMessages = Object.entries(error.fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      return `${error.message}\n\n${fieldMessages}`;
    }

    // Erreur avec code
    if (error.code) {
      return `${error.message} (${error.code})`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inconnue est survenue';
}

/**
 * Affiche une erreur à l'utilisateur
 */
export function showError(error: unknown, title: string = 'Erreur'): void {
  const message = formatApiError(error);
  
  if (Platform.OS === 'web') {
    // Sur le web, utiliser window.alert
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    // Sur mobile, utiliser Alert
    Alert.alert(title, message);
  }
}

/**
 * Affiche un message de succès
 */
export function showSuccess(message: string, title: string = 'Succès'): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
}

