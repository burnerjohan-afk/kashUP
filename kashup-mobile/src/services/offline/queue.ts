/**
 * Queue de mutations offline
 * Stocke les mutations en attente et les rejoue au retour de la connexion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

const QUEUE_KEY = 'offline_mutations_queue';

export interface OfflineMutation {
  id: string;
  type: string; // 'CREATE_TRANSACTION' | 'UPDATE_PROFILE' | etc.
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  timestamp: string;
  retries: number;
}

/**
 * Récupère la queue de mutations
 */
export async function getOfflineQueue(): Promise<OfflineMutation[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) {
      return [];
    }
    return JSON.parse(queueJson);
  } catch (error) {
    logger.error('[OfflineQueue] Erreur récupération queue:', error);
    return [];
  }
}

/**
 * Ajoute une mutation à la queue
 */
export async function addToQueue(
  type: string,
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  data: any
): Promise<string> {
  try {
    const queue = await getOfflineQueue();
    const mutation: OfflineMutation = {
      id: uuidv4(),
      type,
      endpoint,
      method,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    queue.push(mutation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    logger.info(`[OfflineQueue] Mutation ajoutée: ${type} (${mutation.id})`);
    return mutation.id;
  } catch (error) {
    logger.error('[OfflineQueue] Erreur ajout queue:', error);
    throw error;
  }
}

/**
 * Supprime une mutation de la queue
 */
export async function removeFromQueue(mutationId: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter((m) => m.id !== mutationId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));

    logger.info(`[OfflineQueue] Mutation supprimée: ${mutationId}`);
  } catch (error) {
    logger.error('[OfflineQueue] Erreur suppression queue:', error);
  }
}

/**
 * Incrémente le compteur de retries d'une mutation
 */
export async function incrementRetries(mutationId: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const mutation = queue.find((m) => m.id === mutationId);
    if (mutation) {
      mutation.retries += 1;
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    logger.error('[OfflineQueue] Erreur incrément retries:', error);
  }
}

/**
 * Vide la queue
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    logger.info('[OfflineQueue] Queue vidée');
  } catch (error) {
    logger.error('[OfflineQueue] Erreur vidage queue:', error);
  }
}

/**
 * Rejoue toutes les mutations de la queue
 */
export async function replayQueue(
  executeMutation: (mutation: OfflineMutation) => Promise<void>
): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    if (queue.length === 0) {
      logger.info('[OfflineQueue] Queue vide, rien à rejouer');
      return;
    }

    logger.info(`[OfflineQueue] Replay de ${queue.length} mutations`);

    const results = await Promise.allSettled(
      queue.map(async (mutation) => {
        try {
          await executeMutation(mutation);
          await removeFromQueue(mutation.id);
          logger.info(`[OfflineQueue] Mutation réussie: ${mutation.id}`);
        } catch (error) {
          await incrementRetries(mutation.id);
          logger.error(`[OfflineQueue] Mutation échouée: ${mutation.id}`, error);
          // Si trop de retries, supprimer de la queue
          if (mutation.retries >= 5) {
            await removeFromQueue(mutation.id);
            logger.warn(`[OfflineQueue] Mutation abandonnée après 5 retries: ${mutation.id}`);
          }
        }
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info(`[OfflineQueue] Replay terminé: ${succeeded} réussies, ${failed} échouées`);
  } catch (error) {
    logger.error('[OfflineQueue] Erreur replay queue:', error);
    throw error;
  }
}

