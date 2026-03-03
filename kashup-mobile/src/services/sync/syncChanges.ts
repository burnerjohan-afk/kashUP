/**
 * Service de synchronisation globale via endpoint /sync/changes
 * Récupère tous les changements depuis une date donnée
 */

import { queryClient } from '../../lib/queryClient';
import { logger } from '../../utils/logger';
import { apiClient } from '../api/client';

export interface SyncChange {
  type: string; // 'partner' | 'offer' | 'reward' | 'transaction' | etc.
  id: string;
  action: 'created' | 'updated' | 'deleted';
  data?: any;
  timestamp: string;
}

export interface SyncChangesResponse {
  changes: SyncChange[];
  lastSync: string;
}

/**
 * Récupère tous les changements depuis une date donnée
 */
export async function fetchSyncChanges(updatedSince: string): Promise<SyncChangesResponse> {
  try {
    const response = await apiClient.get<SyncChangesResponse>('/sync/changes', {
      params: { updatedSince },
    });

    return response.data;
  } catch (error: any) {
    // Si l'endpoint n'existe pas encore, retourner une réponse vide
    if (error.statusCode === 404) {
      logger.warn('[SyncChanges] Endpoint /sync/changes non disponible');
      return { changes: [], lastSync: updatedSince };
    }
    throw error;
  }
}

/**
 * Applique les changements au cache React Query
 */
export function applySyncChanges(changes: SyncChange[]): void {
  for (const change of changes) {
    const queryKey = [change.type];

    switch (change.action) {
      case 'created':
      case 'updated':
        // Invalider la query pour forcer le refetch
        queryClient.invalidateQueries({ queryKey });
        break;

      case 'deleted':
        // Supprimer la query spécifique si elle existe
        queryClient.removeQueries({ queryKey: [...queryKey, change.id] });
        // Invalider aussi la liste
        queryClient.invalidateQueries({ queryKey });
        break;
    }
  }
}

/**
 * Synchronise toutes les données via l'endpoint /sync/changes
 */
export async function syncAllChanges(updatedSince?: string): Promise<void> {
  try {
    if (!updatedSince) {
      logger.info('[SyncChanges] Sync complète (pas de date)');
      // Invalider tous les caches
      await queryClient.invalidateQueries();
      return;
    }

    logger.info(`[SyncChanges] Sync delta depuis ${updatedSince}`);

    const { changes, lastSync } = await fetchSyncChanges(updatedSince);

    logger.info(`[SyncChanges] ${changes.length} changements récupérés`);

    // Appliquer les changements
    applySyncChanges(changes);

    return;
  } catch (error) {
    logger.error('[SyncChanges] Erreur synchronisation:', error);
    throw error;
  }
}

