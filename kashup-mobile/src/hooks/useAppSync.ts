/**
 * Hook pour la synchronisation au démarrage de l'app
 */

import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getGlobalLastSync } from '../services/sync/deltaSync';
import { syncAllChanges } from '../services/sync/syncChanges';
import { logger } from '../utils/logger';

/**
 * Synchronise toutes les données au démarrage de l'app
 */
export function useAppSync() {
  useEffect(() => {
    const syncOnStart = async () => {
      try {
        const lastSync = await getGlobalLastSync();
        logger.info('[AppSync] Démarrage synchronisation', { lastSync });

        await syncAllChanges(lastSync || undefined);

        logger.info('[AppSync] Synchronisation terminée');
      } catch (error) {
        // Ne pas bloquer l'app si la sync échoue
        logger.error('[AppSync] Erreur synchronisation:', error);
      }
    };

    // Sync immédiate au démarrage (avec délai pour ne pas bloquer le rendu)
    setTimeout(() => {
      syncOnStart();
    }, 1000);

    // Sync périodique toutes les 5 minutes quand l'app est en foreground
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncOnStart();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Sync quand l'app revient au foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncOnStart();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
}

