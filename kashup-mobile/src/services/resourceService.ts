/**
 * Service générique pour les ressources API
 * Pattern standardisé pour toutes les ressources
 */

import { StandardResponse, unwrapStandardResponse } from '../types/api';
import { api } from './api';

/**
 * Service générique pour une ressource
 */
export class ResourceService<T> {
  private resourceName: string;

  constructor(resourceName: string) {
    this.resourceName = resourceName;
  }

  /**
   * Récupère la liste des ressources
   */
  async list(filters?: Record<string, any>): Promise<T[]> {
    if (__DEV__) {
      console.log(`[${this.resourceName}] 🚀 Démarrage récupération liste`);
      console.log(`[${this.resourceName}] 🔍 Filtres:`, filters || 'aucun');
    }

    try {
      const response = await api.get<StandardResponse<T[]>>(`/${this.resourceName}`, {
        params: filters,
      });

      const data = unwrapStandardResponse(response.data);

      if (__DEV__) {
        console.log(`[${this.resourceName}] ✅ Réponse reçue`);
        console.log(`[${this.resourceName}] 📊 Status:`, response.status);
        const count = Array.isArray(data) ? data.length : 0;
        console.log(`[${this.resourceName}] 📦 Nombre d'éléments:`, count);
      }

      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      const errorMessage = error?.message || 'Erreur inconnue';

      if (__DEV__) {
        console.error(`[${this.resourceName}] ❌ Erreur lors de la récupération`);
        console.error(`[${this.resourceName}] Message:`, errorMessage);
      }

      throw new Error(`Impossible de charger les ${this.resourceName}: ${errorMessage}`);
    }
  }

  /**
   * Récupère une ressource par ID
   */
  async get(id: string): Promise<T> {
    if (__DEV__) {
      console.log(`[${this.resourceName}] 🚀 Démarrage récupération ${id}`);
    }

    try {
      const response = await api.get<StandardResponse<T>>(`/${this.resourceName}/${id}`);

      const data = unwrapStandardResponse(response.data);

      if (__DEV__) {
        console.log(`[${this.resourceName}] ✅ Réponse reçue pour ${id}`);
        console.log(`[${this.resourceName}] 📊 Status:`, response.status);
      }

      return data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Erreur inconnue';

      if (__DEV__) {
        console.error(`[${this.resourceName}] ❌ Erreur lors de la récupération de ${id}`);
        console.error(`[${this.resourceName}] Message:`, errorMessage);
      }

      throw new Error(`Impossible de charger le ${this.resourceName} ${id}: ${errorMessage}`);
    }
  }
}

