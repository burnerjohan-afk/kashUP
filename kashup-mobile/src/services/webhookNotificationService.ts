/**
 * Service de gestion des notifications push pour les webhooks
 * 
 * Ce service configure Expo Notifications pour recevoir les webhooks
 * via des notifications push et les traiter automatiquement.
 */

import * as Notifications from 'expo-notifications';
import { handleWebhookFromPayload, WebhookPayload } from './webhookService';

// Fonction pour initialiser les gestionnaires de notifications
// Appelée uniquement quand nécessaire pour éviter les problèmes au démarrage
function initializeNotificationHandlers() {
  try {
    // Configurer le gestionnaire de notifications
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        
        // Si la notification contient un webhook
        if (data?.webhook && data?.event) {
          const payload: WebhookPayload = {
            event: data.event,
            timestamp: data.timestamp || new Date().toISOString(),
            data: data.data || {},
          };

          // Traiter le webhook en arrière-plan
          handleWebhookFromPayload(payload).catch((error) => {
            console.error('[WebhookNotification] Erreur lors du traitement du webhook:', error);
          });
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: true,
        };
      },
    });

    // Écouter les notifications reçues (pour le debugging)
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.webhook) {
        console.log('[WebhookNotification] Webhook reçu via notification:', {
          event: data.event,
          timestamp: data.timestamp,
        });
      }
    });

    // Écouter les interactions avec les notifications
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.webhook) {
        console.log('[WebhookNotification] Utilisateur a interagi avec la notification webhook:', data.event);
      }
    });
  } catch (error) {
    console.error('[WebhookNotification] Erreur lors de l\'initialisation des handlers:', error);
  }
}

/**
 * Configure les notifications webhook et retourne le token Expo Push
 * 
 * @returns Le token Expo Push ou null si les permissions ne sont pas accordées
 */
export async function setupWebhookNotifications(): Promise<string | null> {
  try {
    // Initialiser les handlers de notifications
    initializeNotificationHandlers();

    // Demander les permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[WebhookNotification] Permissions de notification non accordées');
      return null;
    }

    // Obtenir le token Expo Push
    // Note: Dans Expo Go, les notifications push sont limitées (SDK 53+)
    // Le projectId est automatiquement détecté par Expo, pas besoin de le passer
    // Si on est en mode développement (Expo Go), on peut ignorer cette erreur
    let tokenData;
    try {
      tokenData = await Notifications.getExpoPushTokenAsync();
    } catch (error: any) {
      // Dans Expo Go, les notifications push peuvent ne pas fonctionner
      // C'est normal et ne bloque pas l'application
      if (error?.message?.includes('projectId')) {
        console.warn('[WebhookNotification] projectId non trouvé - fonctionnalité limitée dans Expo Go');
        return null;
      }
      throw error;
    }

    console.log('[WebhookNotification] Token Expo Push obtenu:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[WebhookNotification] Erreur lors de la configuration:', error);
    return null;
  }
}

/**
 * Vérifie si les notifications sont activées
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

