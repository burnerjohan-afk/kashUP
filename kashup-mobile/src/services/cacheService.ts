/**
 * Service de cache pour stocker les données mises à jour via les webhooks
 * 
 * Ce service gère le cache local des données (partenaires, offres, récompenses, etc.)
 * et permet d'invalider le cache pour forcer un rafraîchissement depuis l'API.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de stockage pour le cache
const CACHE_KEYS = {
  PARTNERS: 'kashup_cache_partners',
  OFFERS: 'kashup_cache_offers',
  REWARDS: 'kashup_cache_rewards',
  GIFT_CARD_CONFIG: 'kashup_cache_gift_card_config',
  BOX_UP_CONFIG: 'kashup_cache_box_up_config',
  CACHE_VERSION: 'kashup_cache_version',
} as const;

// Version du cache pour gérer les migrations
const CURRENT_CACHE_VERSION = '1.0.0';

// Logger pour le debugging
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[CacheService] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[CacheService] ERROR: ${message}`, error);
  },
};

/**
 * Initialise le cache si nécessaire
 */
async function initializeCache(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(CACHE_KEYS.CACHE_VERSION);
    if (version !== CURRENT_CACHE_VERSION) {
      // Migration ou initialisation du cache
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_VERSION, CURRENT_CACHE_VERSION);
      logger.info('Cache initialisé', { version: CURRENT_CACHE_VERSION });
    }
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation du cache', error);
  }
}

// Initialiser le cache au chargement du module
initializeCache().catch((error) => {
  logger.error('Erreur lors de l\'initialisation initiale du cache', error);
});

/**
 * Service de cache pour les partenaires
 */
export const partnersCache = {
  async get(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.PARTNERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache partenaires', error);
      return [];
    }
  },

  async set(partners: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.PARTNERS, JSON.stringify(partners));
      logger.info('Cache partenaires mis à jour', { count: partners.length });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du cache partenaires', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.PARTNERS);
      logger.info('Cache partenaires vidé');
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache partenaires', error);
    }
  },
};

/**
 * Service de cache pour les offres
 */
export const offersCache = {
  async get(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.OFFERS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache offres', error);
      return [];
    }
  },

  async set(offers: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.OFFERS, JSON.stringify(offers));
      logger.info('Cache offres mis à jour', { count: offers.length });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du cache offres', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.OFFERS);
      logger.info('Cache offres vidé');
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache offres', error);
    }
  },
};

/**
 * Service de cache pour les récompenses
 */
export const rewardsCache = {
  async get(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.REWARDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache récompenses', error);
      return [];
    }
  },

  async set(rewards: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.REWARDS, JSON.stringify(rewards));
      logger.info('Cache récompenses mis à jour', { count: rewards.length });
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du cache récompenses', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.REWARDS);
      logger.info('Cache récompenses vidé');
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache récompenses', error);
    }
  },
};

/**
 * Service de cache pour la configuration des cartes cadeaux
 */
export const giftCardConfigCache = {
  async get(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.GIFT_CARD_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache config cartes cadeaux', error);
      return null;
    }
  },

  async set(config: any): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.GIFT_CARD_CONFIG, JSON.stringify(config));
      logger.info('Cache config cartes cadeaux mis à jour');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du cache config cartes cadeaux', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.GIFT_CARD_CONFIG);
      logger.info('Cache config cartes cadeaux vidé');
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache config cartes cadeaux', error);
    }
  },
};

/**
 * Service de cache pour la configuration Box UP
 */
export const boxUpConfigCache = {
  async get(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.BOX_UP_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du cache config Box UP', error);
      return null;
    }
  },

  async set(config: any): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.BOX_UP_CONFIG, JSON.stringify(config));
      logger.info('Cache config Box UP mis à jour');
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du cache config Box UP', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.BOX_UP_CONFIG);
      logger.info('Cache config Box UP vidé');
    } catch (error) {
      logger.error('Erreur lors de la suppression du cache config Box UP', error);
    }
  },
};

/**
 * Flags pour invalider le cache et forcer un rafraîchissement
 */
const INVALIDATION_FLAGS = {
  PARTNERS: 'kashup_cache_invalidate_partners',
  OFFERS: 'kashup_cache_invalidate_offers',
  REWARDS: 'kashup_cache_invalidate_rewards',
  GIFT_CARD_CONFIG: 'kashup_cache_invalidate_gift_card_config',
  BOX_UP_CONFIG: 'kashup_cache_invalidate_box_up_config',
} as const;

/**
 * Service de cache principal avec toutes les fonctionnalités
 */
export const cacheService = {
  // Partenaires
  async getPartners(): Promise<any[]> {
    return partnersCache.get();
  },

  async setPartners(partners: any[]): Promise<void> {
    return partnersCache.set(partners);
  },

  async invalidatePartnersCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(INVALIDATION_FLAGS.PARTNERS, Date.now().toString());
      logger.info('Cache partenaires invalidé');
    } catch (error) {
      logger.error('Erreur lors de l\'invalidation du cache partenaires', error);
    }
  },

  async isPartnersCacheInvalidated(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(INVALIDATION_FLAGS.PARTNERS);
      return flag !== null;
    } catch {
      return false;
    }
  },

  async clearPartnersInvalidationFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INVALIDATION_FLAGS.PARTNERS);
    } catch (error) {
      logger.error('Erreur lors de la suppression du flag d\'invalidation partenaires', error);
    }
  },

  // Offres
  async getOffers(): Promise<any[]> {
    return offersCache.get();
  },

  async setOffers(offers: any[]): Promise<void> {
    return offersCache.set(offers);
  },

  async invalidateOffersCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(INVALIDATION_FLAGS.OFFERS, Date.now().toString());
      logger.info('Cache offres invalidé');
    } catch (error) {
      logger.error('Erreur lors de l\'invalidation du cache offres', error);
    }
  },

  async isOffersCacheInvalidated(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(INVALIDATION_FLAGS.OFFERS);
      return flag !== null;
    } catch {
      return false;
    }
  },

  async clearOffersInvalidationFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INVALIDATION_FLAGS.OFFERS);
    } catch (error) {
      logger.error('Erreur lors de la suppression du flag d\'invalidation offres', error);
    }
  },

  // Récompenses
  async getRewards(): Promise<any[]> {
    return rewardsCache.get();
  },

  async setRewards(rewards: any[]): Promise<void> {
    return rewardsCache.set(rewards);
  },

  async invalidateRewardsCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(INVALIDATION_FLAGS.REWARDS, Date.now().toString());
      logger.info('Cache récompenses invalidé');
    } catch (error) {
      logger.error('Erreur lors de l\'invalidation du cache récompenses', error);
    }
  },

  async isRewardsCacheInvalidated(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(INVALIDATION_FLAGS.REWARDS);
      return flag !== null;
    } catch {
      return false;
    }
  },

  async clearRewardsInvalidationFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INVALIDATION_FLAGS.REWARDS);
    } catch (error) {
      logger.error('Erreur lors de la suppression du flag d\'invalidation récompenses', error);
    }
  },

  // Configuration cartes cadeaux
  async getGiftCardConfig(): Promise<any | null> {
    return giftCardConfigCache.get();
  },

  async setGiftCardConfig(config: any): Promise<void> {
    return giftCardConfigCache.set(config);
  },

  async invalidateGiftCardConfigCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(INVALIDATION_FLAGS.GIFT_CARD_CONFIG, Date.now().toString());
      logger.info('Cache config cartes cadeaux invalidé');
    } catch (error) {
      logger.error('Erreur lors de l\'invalidation du cache config cartes cadeaux', error);
    }
  },

  async isGiftCardConfigCacheInvalidated(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(INVALIDATION_FLAGS.GIFT_CARD_CONFIG);
      return flag !== null;
    } catch {
      return false;
    }
  },

  async clearGiftCardConfigInvalidationFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INVALIDATION_FLAGS.GIFT_CARD_CONFIG);
    } catch (error) {
      logger.error('Erreur lors de la suppression du flag d\'invalidation config cartes cadeaux', error);
    }
  },

  // Configuration Box UP
  async getBoxUpConfig(): Promise<any | null> {
    return boxUpConfigCache.get();
  },

  async setBoxUpConfig(config: any): Promise<void> {
    return boxUpConfigCache.set(config);
  },

  async invalidateBoxUpConfigCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(INVALIDATION_FLAGS.BOX_UP_CONFIG, Date.now().toString());
      logger.info('Cache config Box UP invalidé');
    } catch (error) {
      logger.error('Erreur lors de l\'invalidation du cache config Box UP', error);
    }
  },

  async isBoxUpConfigCacheInvalidated(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(INVALIDATION_FLAGS.BOX_UP_CONFIG);
      return flag !== null;
    } catch {
      return false;
    }
  },

  async clearBoxUpConfigInvalidationFlag(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INVALIDATION_FLAGS.BOX_UP_CONFIG);
    } catch (error) {
      logger.error('Erreur lors de la suppression du flag d\'invalidation config Box UP', error);
    }
  },

  // Utilitaires
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        partnersCache.clear(),
        offersCache.clear(),
        rewardsCache.clear(),
        giftCardConfigCache.clear(),
        boxUpConfigCache.clear(),
      ]);
      logger.info('Tous les caches ont été vidés');
    } catch (error) {
      logger.error('Erreur lors de la suppression de tous les caches', error);
    }
  },
};

