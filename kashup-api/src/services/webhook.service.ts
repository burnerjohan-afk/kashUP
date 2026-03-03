import logger from '../utils/logger';
import env from '../config/env';

// Configuration des webhooks
const MOBILE_WEBHOOK_URL = env.MOBILE_WEBHOOK_URL || '';
const WEBHOOK_TIMEOUT = 10000; // 10 secondes
const WEBHOOK_RETRIES = 2; // Nombre de tentatives en cas d'échec

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

/**
 * Envoie un webhook avec retry automatique
 */
const sendWebhookWithRetry = async (
  url: string,
  payload: WebhookPayload,
  retries: number = WEBHOOK_RETRIES
): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'kashup-api',
        'X-Webhook-Event': payload.event,
        'User-Agent': 'KashUP-API/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && error instanceof Error && !error.name.includes('Abort')) {
      logger.warn({
        event: payload.event,
        retriesLeft: retries - 1,
        error: error.message
      }, 'Tentative de retry du webhook');
      
      // Attendre 1 seconde avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendWebhookWithRetry(url, payload, retries - 1);
    }

    throw error;
  }
};

/**
 * Émet un webhook vers l'application mobile
 * @param event - Nom de l'événement (ex: 'partner.created')
 * @param data - Données à envoyer
 */
export const emitWebhook = async (event: string, data: any): Promise<void> => {
  if (!MOBILE_WEBHOOK_URL) {
    logger.debug({ event }, 'MOBILE_WEBHOOK_URL non configuré, webhook non envoyé');
    return;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  try {
    const success = await sendWebhookWithRetry(MOBILE_WEBHOOK_URL, payload);
    
    if (success) {
      logger.info({ 
        event,
        url: MOBILE_WEBHOOK_URL 
      }, 'Webhook envoyé avec succès');
    }
  } catch (error) {
    logger.error({
      event,
      url: MOBILE_WEBHOOK_URL,
      error: error instanceof Error ? error.message : String(error)
    }, 'Erreur lors de l\'envoi du webhook après toutes les tentatives');
  }
};

// Fonctions helper pour les différents types d'événements

export const emitPartnerWebhook = async (event: 'partner.created' | 'partner.updated' | 'partner.status.changed', partner: any) => {
  await emitWebhook(event, { partner });
};

export const emitOfferWebhook = async (
  event: 'offer.created' | 'offer.updated' | 'offer.stock.changed' | 'offer.status.changed',
  offer: any
) => {
  await emitWebhook(event, { offer });
};

export const emitRewardWebhook = async (
  event: 'reward.created' | 'reward.updated' | 'reward.status.changed' | 'reward.stock.changed',
  reward: any
) => {
  await emitWebhook(event, { reward });
};

export const emitGiftCardConfigWebhook = async (config: any) => {
  await emitWebhook('gift-card-config.updated', { config });
};

export const emitBoxUpConfigWebhook = async (config: any) => {
  await emitWebhook('box-up-config.updated', { config });
};

