/**
 * Utilitaire pour synchroniser les modifications avec l'application mobile
 * via webhooks
 */

type SyncEvent = 
  | 'partner.created'
  | 'partner.updated'
  | 'partner.status.changed'
  | 'offer.created'
  | 'offer.updated'
  | 'offer.stock.changed'
  | 'offer.status.changed'
  | 'reward.created'
  | 'reward.updated'
  | 'reward.status.changed'
  | 'reward.stock.changed'
  | 'gift-card-config.updated'
  | 'box-up-config.updated';

interface SyncPayload {
  event: SyncEvent;
  timestamp: string;
  data: unknown;
}

/**
 * Envoie un webhook à l'application mobile pour synchroniser les données
 */
export async function syncWithMobile(event: SyncEvent, data: unknown): Promise<void> {
  const mobileWebhookUrl = import.meta.env.VITE_MOBILE_WEBHOOK_URL;
  const autoSyncEnabled = import.meta.env.VITE_AUTO_SYNC_ENABLED === 'true';

  // Vérifier si la synchronisation est activée
  if (!autoSyncEnabled || !mobileWebhookUrl) {
    return;
  }

  const payload: SyncPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const response = await fetch(mobileWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to sync with mobile: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error syncing with mobile:', error);
    // Ne pas bloquer l'opération principale en cas d'erreur de synchronisation
  }
}

