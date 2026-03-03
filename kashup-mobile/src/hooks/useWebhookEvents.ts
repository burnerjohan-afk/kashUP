/**
 * Hook pour gérer les événements webhook et rafraîchir automatiquement les données
 * 
 * Ce hook surveille les invalidations de cache et déclenche un rafraîchissement
 * des données lorsque des webhooks sont traités.
 */

import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cacheService } from '../services/cacheService';

const POLLING_INTERVAL = 5000; // Vérifier toutes les 5 secondes

export type WebhookRefreshCallback = () => Promise<void> | void;

/**
 * Hook pour écouter les événements webhook et rafraîchir les données
 * 
 * @param callbacks - Objet contenant les callbacks de rafraîchissement pour chaque type de données
 * @param enabled - Active ou désactive l'écoute des événements (par défaut: true)
 */
export function useWebhookEvents(
  callbacks: {
    onPartnersChanged?: WebhookRefreshCallback;
    onOffersChanged?: WebhookRefreshCallback;
    onRewardsChanged?: WebhookRefreshCallback;
    onGiftCardConfigChanged?: WebhookRefreshCallback;
    onBoxUpConfigChanged?: WebhookRefreshCallback;
  },
  enabled: boolean = true
) {
  const callbacksRef = useRef(callbacks);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Mettre à jour les callbacks
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Fonction pour vérifier les invalidations de cache
  const checkCacheInvalidations = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      // Vérifier les partenaires
      if (await cacheService.isPartnersCacheInvalidated()) {
        await cacheService.clearPartnersInvalidationFlag();
        if (callbacksRef.current.onPartnersChanged) {
          await callbacksRef.current.onPartnersChanged();
        }
      }

      // Vérifier les offres
      if (await cacheService.isOffersCacheInvalidated()) {
        await cacheService.clearOffersInvalidationFlag();
        if (callbacksRef.current.onOffersChanged) {
          await callbacksRef.current.onOffersChanged();
        }
      }

      // Vérifier les récompenses
      if (await cacheService.isRewardsCacheInvalidated()) {
        await cacheService.clearRewardsInvalidationFlag();
        if (callbacksRef.current.onRewardsChanged) {
          await callbacksRef.current.onRewardsChanged();
        }
      }

      // Vérifier la configuration des cartes cadeaux
      if (await cacheService.isGiftCardConfigCacheInvalidated()) {
        await cacheService.clearGiftCardConfigInvalidationFlag();
        if (callbacksRef.current.onGiftCardConfigChanged) {
          await callbacksRef.current.onGiftCardConfigChanged();
        }
      }

      // Vérifier la configuration Box UP
      if (await cacheService.isBoxUpConfigCacheInvalidated()) {
        await cacheService.clearBoxUpConfigInvalidationFlag();
        if (callbacksRef.current.onBoxUpConfigChanged) {
          await callbacksRef.current.onBoxUpConfigChanged();
        }
      }
    } catch (error) {
      console.error('[useWebhookEvents] Erreur lors de la vérification des invalidations', error);
    } finally {
      isPollingRef.current = false;
    }
  }, []);

  // Démarrer/arrêter le polling
  useEffect(() => {
    if (!enabled) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Vérifier immédiatement
    checkCacheInvalidations();

    // Démarrer le polling
    pollingIntervalRef.current = setInterval(() => {
      checkCacheInvalidations();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, checkCacheInvalidations]);

  // Vérifier également quand l'app revient au premier plan
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkCacheInvalidations();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, checkCacheInvalidations]);

  return {
    checkNow: checkCacheInvalidations,
  };
}

