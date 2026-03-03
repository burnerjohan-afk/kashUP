/**
 * Service de traitement des webhooks
 * 
 * Ce service traite les événements webhook reçus depuis l'API backend
 * et met à jour le cache local de l'application.
 * 
 * Note: Dans une application mobile, les webhooks sont généralement reçus
 * via un service intermédiaire (notifications push) ou un serveur qui
 * redirige les webhooks vers l'application.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheService } from './cacheService';

// Types pour les événements webhook
export type WebhookEvent =
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

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: {
    partner?: any;
    offer?: any;
    reward?: any;
    giftCardConfig?: any;
    boxUpConfig?: any;
  };
};

export type WebhookRequest = {
  headers: {
    'content-type'?: string;
    'x-webhook-source'?: string;
    'x-webhook-event'?: string;
  };
  body: WebhookPayload;
};

// Clés de stockage pour le cache
const CACHE_KEYS = {
  PARTNERS: 'kashup_cache_partners',
  OFFERS: 'kashup_cache_offers',
  REWARDS: 'kashup_cache_rewards',
  GIFT_CARD_CONFIG: 'kashup_cache_gift_card_config',
  BOX_UP_CONFIG: 'kashup_cache_box_up_config',
  LAST_WEBHOOK_TIMESTAMP: 'kashup_last_webhook_timestamp',
} as const;

// Logger pour le debugging
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[WebhookService] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[WebhookService] ERROR: ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WebhookService] WARN: ${message}`, data);
  },
};

/**
 * Vérifie que la requête webhook provient bien de kashup-api
 */
function validateWebhookSource(headers: WebhookRequest['headers']): boolean {
  const source = headers['x-webhook-source'];
  if (!source || source !== 'kashup-api') {
    logger.warn('Source webhook invalide', { source });
    return false;
  }
  return true;
}

/**
 * Vérifie que le Content-Type est correct
 */
function validateContentType(headers: WebhookRequest['headers']): boolean {
  const contentType = headers['content-type']?.toLowerCase();
  if (!contentType || !contentType.includes('application/json')) {
    logger.warn('Content-Type invalide', { contentType });
    return false;
  }
  return true;
}

/**
 * Traite un événement de partenaire
 */
async function handlePartnerEvent(
  event: WebhookEvent,
  partnerData: any
): Promise<void> {
  logger.info(`Traitement de l'événement partenaire: ${event}`, { partnerId: partnerData?.id });

  try {
    // Récupérer le cache actuel des partenaires
    const cachedPartners = await cacheService.getPartners();
    
    if (event === 'partner.created') {
      // Ajouter le nouveau partenaire
      if (partnerData && !cachedPartners.find((p: any) => p.id === partnerData.id)) {
        cachedPartners.push(partnerData);
        await cacheService.setPartners(cachedPartners);
        logger.info('Partenaire créé et ajouté au cache', { partnerId: partnerData.id });
      }
    } else if (event === 'partner.updated' || event === 'partner.status.changed') {
      // Mettre à jour le partenaire existant
      const index = cachedPartners.findIndex((p: any) => p.id === partnerData?.id);
      if (index !== -1 && partnerData) {
        cachedPartners[index] = { ...cachedPartners[index], ...partnerData };
        await cacheService.setPartners(cachedPartners);
        logger.info('Partenaire mis à jour dans le cache', { partnerId: partnerData.id });
      } else if (partnerData) {
        // Si le partenaire n'existe pas, l'ajouter
        cachedPartners.push(partnerData);
        await cacheService.setPartners(cachedPartners);
        logger.info('Partenaire ajouté au cache (n\'existait pas)', { partnerId: partnerData.id });
      }
    }

    // Invalider le cache pour forcer un rafraîchissement
    await cacheService.invalidatePartnersCache();
  } catch (error) {
    logger.error('Erreur lors du traitement de l\'événement partenaire', error);
    throw error;
  }
}

/**
 * Traite un événement d'offre
 */
async function handleOfferEvent(
  event: WebhookEvent,
  offerData: any
): Promise<void> {
  logger.info(`Traitement de l'événement offre: ${event}`, { offerId: offerData?.id });

  try {
    // Récupérer le cache actuel des offres
    const cachedOffers = await cacheService.getOffers();
    
    if (event === 'offer.created') {
      // Ajouter la nouvelle offre
      if (offerData && !cachedOffers.find((o: any) => o.id === offerData.id)) {
        cachedOffers.push(offerData);
        await cacheService.setOffers(cachedOffers);
        logger.info('Offre créée et ajoutée au cache', { offerId: offerData.id });
      }
    } else if (
      event === 'offer.updated' ||
      event === 'offer.stock.changed' ||
      event === 'offer.status.changed'
    ) {
      // Mettre à jour l'offre existante
      const index = cachedOffers.findIndex((o: any) => o.id === offerData?.id);
      if (index !== -1 && offerData) {
        cachedOffers[index] = { ...cachedOffers[index], ...offerData };
        await cacheService.setOffers(cachedOffers);
        logger.info('Offre mise à jour dans le cache', { offerId: offerData.id });
      } else if (offerData) {
        // Si l'offre n'existe pas, l'ajouter
        cachedOffers.push(offerData);
        await cacheService.setOffers(cachedOffers);
        logger.info('Offre ajoutée au cache (n\'existait pas)', { offerId: offerData.id });
      }
    }

    // Invalider le cache pour forcer un rafraîchissement
    await cacheService.invalidateOffersCache();
  } catch (error) {
    logger.error('Erreur lors du traitement de l\'événement offre', error);
    throw error;
  }
}

/**
 * Traite un événement de récompense
 */
async function handleRewardEvent(
  event: WebhookEvent,
  rewardData: any
): Promise<void> {
  logger.info(`Traitement de l'événement récompense: ${event}`, { rewardId: rewardData?.id });

  try {
    // Récupérer le cache actuel des récompenses
    const cachedRewards = await cacheService.getRewards();
    
    if (event === 'reward.created') {
      // Ajouter la nouvelle récompense
      if (rewardData && !cachedRewards.find((r: any) => r.id === rewardData.id)) {
        cachedRewards.push(rewardData);
        await cacheService.setRewards(cachedRewards);
        logger.info('Récompense créée et ajoutée au cache', { rewardId: rewardData.id });
      }
    } else if (
      event === 'reward.updated' ||
      event === 'reward.status.changed' ||
      event === 'reward.stock.changed'
    ) {
      // Mettre à jour la récompense existante
      const index = cachedRewards.findIndex((r: any) => r.id === rewardData?.id);
      if (index !== -1 && rewardData) {
        cachedRewards[index] = { ...cachedRewards[index], ...rewardData };
        await cacheService.setRewards(cachedRewards);
        logger.info('Récompense mise à jour dans le cache', { rewardId: rewardData.id });
      } else if (rewardData) {
        // Si la récompense n'existe pas, l'ajouter
        cachedRewards.push(rewardData);
        await cacheService.setRewards(cachedRewards);
        logger.info('Récompense ajoutée au cache (n\'existait pas)', { rewardId: rewardData.id });
      }
    }

    // Invalider le cache pour forcer un rafraîchissement
    await cacheService.invalidateRewardsCache();
  } catch (error) {
    logger.error('Erreur lors du traitement de l\'événement récompense', error);
    throw error;
  }
}

/**
 * Traite un événement de configuration de carte cadeau
 */
async function handleGiftCardConfigEvent(configData: any): Promise<void> {
  logger.info('Traitement de l\'événement gift-card-config.updated', { configId: configData?.id });

  try {
    await cacheService.setGiftCardConfig(configData);
    await cacheService.invalidateGiftCardConfigCache();
    logger.info('Configuration des cartes cadeaux mise à jour dans le cache');
  } catch (error) {
    logger.error('Erreur lors du traitement de l\'événement gift-card-config', error);
    throw error;
  }
}

/**
 * Traite un événement de configuration Box UP
 */
async function handleBoxUpConfigEvent(configData: any): Promise<void> {
  logger.info('Traitement de l\'événement box-up-config.updated', { configId: configData?.id });

  try {
    await cacheService.setBoxUpConfig(configData);
    await cacheService.invalidateBoxUpConfigCache();
    logger.info('Configuration Box UP mise à jour dans le cache');
  } catch (error) {
    logger.error('Erreur lors du traitement de l\'événement box-up-config', error);
    throw error;
  }
}

/**
 * Traite un événement webhook
 */
async function processWebhookEvent(payload: WebhookPayload): Promise<void> {
  const { event, data, timestamp } = payload;

  logger.info(`Traitement de l'événement: ${event}`, { timestamp });

  // Sauvegarder le timestamp du dernier webhook
  await AsyncStorage.setItem(CACHE_KEYS.LAST_WEBHOOK_TIMESTAMP, timestamp);

  // Traiter l'événement selon son type
  switch (event) {
    case 'partner.created':
    case 'partner.updated':
    case 'partner.status.changed':
      if (data.partner) {
        await handlePartnerEvent(event, data.partner);
      } else {
        logger.warn('Données partenaire manquantes dans le payload', { event });
      }
      break;

    case 'offer.created':
    case 'offer.updated':
    case 'offer.stock.changed':
    case 'offer.status.changed':
      if (data.offer) {
        await handleOfferEvent(event, data.offer);
      } else {
        logger.warn('Données offre manquantes dans le payload', { event });
      }
      break;

    case 'reward.created':
    case 'reward.updated':
    case 'reward.status.changed':
    case 'reward.stock.changed':
      if (data.reward) {
        await handleRewardEvent(event, data.reward);
      } else {
        logger.warn('Données récompense manquantes dans le payload', { event });
      }
      break;

    case 'gift-card-config.updated':
      if (data.giftCardConfig) {
        await handleGiftCardConfigEvent(data.giftCardConfig);
      } else {
        logger.warn('Données configuration carte cadeau manquantes dans le payload');
      }
      break;

    case 'box-up-config.updated':
      if (data.boxUpConfig) {
        await handleBoxUpConfigEvent(data.boxUpConfig);
      } else {
        logger.warn('Données configuration Box UP manquantes dans le payload');
      }
      break;

    default:
      logger.warn('Type d\'événement non reconnu', { event });
  }
}

/**
 * Traite une requête webhook POST
 * 
 * Cette fonction simule le traitement d'un endpoint POST /api/webhooks
 * Dans une application mobile, cette fonction serait appelée depuis :
 * - Un service de notifications push qui reçoit les webhooks
 * - Un serveur intermédiaire qui redirige les webhooks
 * - Un système de polling qui vérifie les mises à jour
 * 
 * @param request - La requête webhook avec headers et body
 * @returns Une réponse avec status et message
 */
export async function handleWebhookRequest(
  request: WebhookRequest
): Promise<{ status: number; message: string; data?: any }> {
  try {
    logger.info('Réception d\'une requête webhook', {
      source: request.headers['x-webhook-source'],
      event: request.headers['x-webhook-event'],
    });

    // 1. Vérifier le header X-Webhook-Source
    if (!validateWebhookSource(request.headers)) {
      return {
        status: 403,
        message: 'Source webhook non autorisée. Seule kashup-api est autorisée.',
      };
    }

    // 2. Vérifier le Content-Type
    if (!validateContentType(request.headers)) {
      return {
        status: 400,
        message: 'Content-Type invalide. application/json requis.',
      };
    }

    // 3. Parser le payload JSON (déjà parsé dans request.body)
    const payload = request.body;
    if (!payload || !payload.event || !payload.timestamp) {
      return {
        status: 400,
        message: 'Payload invalide. Les champs event et timestamp sont requis.',
      };
    }

    // 4. Vérifier que l'événement dans le header correspond au payload
    const headerEvent = request.headers['x-webhook-event'];
    if (headerEvent && headerEvent !== payload.event) {
      logger.warn('Incohérence entre header et payload', {
        headerEvent,
        payloadEvent: payload.event,
      });
    }

    // 5. Traiter l'événement
    await processWebhookEvent(payload);

    // 6. Retourner une réponse 200 OK
    logger.info('Webhook traité avec succès', { event: payload.event });
    return {
      status: 200,
      message: 'Webhook traité avec succès',
      data: {
        event: payload.event,
        timestamp: payload.timestamp,
      },
    };
  } catch (error) {
    logger.error('Erreur lors du traitement du webhook', error);
    return {
      status: 500,
      message: 'Erreur interne lors du traitement du webhook',
      data: {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      },
    };
  }
}

/**
 * Traite un webhook depuis un payload JSON brut
 * Utile pour les intégrations avec des services de notifications push
 */
export async function handleWebhookFromPayload(
  payload: WebhookPayload,
  headers?: Partial<WebhookRequest['headers']>
): Promise<{ status: number; message: string; data?: any }> {
  const request: WebhookRequest = {
    headers: {
      'content-type': 'application/json',
      'x-webhook-source': 'kashup-api',
      'x-webhook-event': payload.event,
      ...headers,
    },
    body: payload,
  };

  return handleWebhookRequest(request);
}

/**
 * Récupère le timestamp du dernier webhook traité
 */
export async function getLastWebhookTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_KEYS.LAST_WEBHOOK_TIMESTAMP);
  } catch (error) {
    logger.error('Erreur lors de la récupération du timestamp', error);
    return null;
  }
}

