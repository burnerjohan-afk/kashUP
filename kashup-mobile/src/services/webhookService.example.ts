/**
 * EXEMPLE D'UTILISATION DU SERVICE WEBHOOK
 * 
 * Ce fichier montre comment intégrer le service webhook dans votre application.
 * Dans une application mobile, les webhooks sont généralement reçus via :
 * 1. Un service de notifications push (Expo Notifications)
 * 2. Un serveur intermédiaire qui redirige les webhooks
 * 3. Un système de polling qui vérifie les mises à jour
 */

import * as Notifications from 'expo-notifications';
import { handleWebhookFromPayload, handleWebhookRequest, WebhookPayload } from './webhookService';

/**
 * EXEMPLE 1: Intégration avec Expo Notifications
 * 
 * Configurez Expo Notifications pour recevoir les webhooks via des notifications push.
 * Le backend doit envoyer les webhooks sous forme de notifications push avec le payload dans data.
 */
export async function setupWebhookNotifications() {
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

        // Traiter le webhook
        const result = await handleWebhookFromPayload(payload);
        console.log('Webhook traité:', result);
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });

  // Écouter les notifications reçues
  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data;
    if (data?.webhook) {
      console.log('Webhook reçu via notification:', data);
    }
  });

  // Demander les permissions
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Permissions de notification non accordées');
  }
}

/**
 * EXEMPLE 2: Traitement direct d'un webhook depuis un payload JSON
 * 
 * Utilisez cette fonction lorsque vous recevez un webhook depuis une source externe
 * (par exemple, un serveur intermédiaire ou un système de polling).
 */
export async function processWebhookExample() {
  // Exemple de payload webhook
  const webhookPayload: WebhookPayload = {
    event: 'partner.created',
    timestamp: '2024-01-01T12:00:00Z',
    data: {
      partner: {
        id: 'partner-123',
        name: 'Nouveau Partenaire',
        // ... autres propriétés du partenaire
      },
    },
  };

  // Traiter le webhook
  const result = await handleWebhookFromPayload(webhookPayload);
  
  if (result.status === 200) {
    console.log('Webhook traité avec succès:', result.message);
  } else {
    console.error('Erreur lors du traitement du webhook:', result.message);
  }
}

/**
 * EXEMPLE 3: Traitement d'une requête webhook complète
 * 
 * Utilisez cette fonction lorsque vous recevez une requête HTTP complète
 * (par exemple, depuis un serveur Express ou un endpoint API).
 */
export async function processWebhookRequestExample() {
  // Simuler une requête webhook
  const webhookRequest = {
    headers: {
      'content-type': 'application/json',
      'x-webhook-source': 'kashup-api',
      'x-webhook-event': 'offer.updated',
    },
    body: {
      event: 'offer.updated',
      timestamp: '2024-01-01T12:00:00Z',
      data: {
        offer: {
          id: 'offer-123',
          title: 'Offre mise à jour',
          // ... autres propriétés de l'offre
        },
      },
    },
  };

  // Traiter la requête webhook
  const result = await handleWebhookRequest(webhookRequest);
  
  if (result.status === 200) {
    console.log('Webhook traité avec succès:', result.message);
  } else {
    console.error('Erreur lors du traitement du webhook:', result.message);
  }
}

/**
 * EXEMPLE 4: Intégration avec un système de polling
 * 
 * Si vous ne pouvez pas recevoir des webhooks directement, vous pouvez
 * implémenter un système de polling qui vérifie périodiquement les mises à jour.
 */
export async function setupWebhookPolling(apiUrl: string, intervalMs: number = 30000) {
  let lastTimestamp: string | null = null;

  const poll = async () => {
    try {
      // Récupérer le timestamp du dernier webhook traité
      const { getLastWebhookTimestamp } = require('./webhookService');
      lastTimestamp = await getLastWebhookTimestamp();

      // Appeler votre API pour vérifier les nouveaux événements
      const response = await fetch(`${apiUrl}/webhooks/events?since=${lastTimestamp || ''}`);
      const events = await response.json();

      // Traiter chaque événement
      for (const event of events) {
        const result = await handleWebhookFromPayload(event);
        if (result.status === 200) {
          console.log('Événement traité:', event.event);
        }
      }
    } catch (error) {
      console.error('Erreur lors du polling des webhooks:', error);
    }
  };

  // Démarrer le polling
  setInterval(poll, intervalMs);
  
  // Poller immédiatement
  poll();
}

/**
 * EXEMPLE 5: Utilisation dans un composant React
 * 
 * Le hook useWebhookEvents est déjà intégré dans les écrans principaux.
 * Voici un exemple d'utilisation personnalisée :
 */
/*
import { useWebhookEvents } from '@/src/hooks/useWebhookEvents';
import { usePartners } from '@/src/hooks/usePartners';

function MyComponent() {
  const { data, refetch } = usePartners();

  // Écouter les événements webhook pour les partenaires
  useWebhookEvents({
    onPartnersChanged: refetch,
  });

  return (
    // Votre composant
  );
}
*/

