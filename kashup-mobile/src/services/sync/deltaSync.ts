/**
 * Service de synchronisation delta
 * Synchronise uniquement les données modifiées depuis la dernière sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '../../lib/queryClient';
import { logger } from '../../utils/logger';

const LAST_SYNC_KEY_PREFIX = 'lastSync_';
const GLOBAL_SYNC_KEY = 'lastSync_global';

/**
 * Récupère la date de dernière synchronisation pour une ressource
 */
export async function getLastSync(resourceName: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${LAST_SYNC_KEY_PREFIX}${resourceName}`);
  } catch (error) {
    logger.error(`[DeltaSync] Erreur récupération lastSync pour ${resourceName}:`, error);
    return null;
  }
}

/**
 * Enregistre la date de dernière synchronisation pour une ressource
 */
export async function setLastSync(resourceName: string, timestamp: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LAST_SYNC_KEY_PREFIX}${resourceName}`, timestamp);
  } catch (error) {
    logger.error(`[DeltaSync] Erreur enregistrement lastSync pour ${resourceName}:`, error);
  }
}

/**
 * Récupère la date de dernière synchronisation globale
 */
export async function getGlobalLastSync(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GLOBAL_SYNC_KEY);
  } catch (error) {
    logger.error('[DeltaSync] Erreur récupération lastSync global:', error);
    return null;
  }
}

/**
 * Enregistre la date de dernière synchronisation globale
 */
export async function setGlobalLastSync(timestamp: string): Promise<void> {
  try {
    await AsyncStorage.setItem(GLOBAL_SYNC_KEY, timestamp);
  } catch (error) {
    logger.error('[DeltaSync] Erreur enregistrement lastSync global:', error);
  }
}

/**
 * Synchronise une ressource spécifique
 */
export async function syncResource(
  resourceName: string,
  fetchFunction: (updatedSince?: string) => Promise<any>
): Promise<void> {
  try {
    const lastSync = await getLastSync(resourceName);
    const updatedSince = lastSync || undefined;

    logger.info(`[DeltaSync] Synchronisation ${resourceName} depuis ${updatedSince || 'début'}`);

    await fetchFunction(updatedSince);

    // Mettre à jour la date de dernière sync
    await setLastSync(resourceName, new Date().toISOString());

    logger.info(`[DeltaSync] Synchronisation ${resourceName} terminée`);
  } catch (error) {
    logger.error(`[DeltaSync] Erreur synchronisation ${resourceName}:`, error);
    throw error;
  }
}

/**
 * Synchronise toutes les ressources
 */
export async function syncAllResources(
  resources: Array<{ name: string; fetch: (updatedSince?: string) => Promise<any> }>
): Promise<void> {
  try {
    const globalLastSync = await getGlobalLastSync();
    const timestamp = globalLastSync || undefined;

    logger.info('[DeltaSync] Démarrage synchronisation globale', { timestamp });

    // Synchroniser toutes les ressources en parallèle
    await Promise.all(
      resources.map((resource) =>
        syncResource(resource.name, async (updatedSince) => {
          // Utiliser la date globale si pas de date spécifique
          const since = updatedSince || timestamp;
          return resource.fetch(since);
        })
      )
    );

    // Mettre à jour la date de sync globale
    await setGlobalLastSync(new Date().toISOString());

    logger.info('[DeltaSync] Synchronisation globale terminée');
  } catch (error) {
    logger.error('[DeltaSync] Erreur synchronisation globale:', error);
    throw error;
  }
}

/**
 * Invalide et resynchronise une ressource
 */
export async function invalidateAndSync(
  resourceName: string,
  fetchFunction: (updatedSince?: string) => Promise<any>
): Promise<void> {
  // Invalider le cache React Query
  await queryClient.invalidateQueries({ queryKey: [resourceName] });

  // Resynchroniser
  await syncResource(resourceName, fetchFunction);
}

