/**
 * Service pour les partenaires
 * Pattern standardisé: GET /api/v1/partners (liste) et GET /api/v1/partners/:id (détail)
 */

import { StandardResponse, unwrapStandardResponse } from '../types/api';
import { api } from './api';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  shortDescription?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tauxCashbackBase: number;
  territory: string;
  latitude?: number | null;
  longitude?: number | null;
  boostable: boolean;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  marketingPrograms?: Array<'pepites' | 'boosted' | 'most-searched'>;
}

export interface PartnersFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  territoire?: 'Martinique' | 'Guadeloupe' | 'Guyane';
  status?: string;
  autourDeMoi?: string;
}

/**
 * Récupère la liste des partenaires avec filtres
 */
export async function getPartners(
  filters?: PartnersFilters
): Promise<Partner[]> {
  if (__DEV__) {
    console.log('[getPartners] 🚀 Démarrage récupération partenaires');
    console.log('[getPartners] 🔍 Filtres:', filters || 'aucun');
  }

  try {
    const response = await api.get<StandardResponse<{ partners: Partner[] }>>('/partners', {
      params: filters,
    });

    const data = unwrapStandardResponse(response.data);

    if (__DEV__) {
      console.log('[getPartners] ✅ Réponse reçue');
      console.log('[getPartners] 📊 Status:', response.status);
      const partnersCount = data?.partners?.length || 0;
      console.log('[getPartners] 📦 Nombre de partenaires:', partnersCount);
    }

    return data?.partners || [];
  } catch (error: any) {
    const errorMessage = error?.message || 'Erreur inconnue';
    
    if (__DEV__) {
      console.error('[getPartners] ❌ Erreur lors de la récupération');
      console.error('[getPartners] Message:', errorMessage);
    }

    throw new Error(`Impossible de charger les partenaires: ${errorMessage}`);
  }
}

/**
 * Récupère un partenaire par ID
 */
export async function getPartner(id: string): Promise<Partner> {
  if (__DEV__) {
    console.log('[getPartner] 🚀 Démarrage récupération partenaire', id);
  }

  try {
    const response = await api.get<StandardResponse<Partner>>(`/partners/${id}`);

    const data = unwrapStandardResponse(response.data);

    if (__DEV__) {
      console.log('[getPartner] ✅ Réponse reçue pour', id);
      console.log('[getPartner] 📊 Status:', response.status);
    }

    return data;
  } catch (error: any) {
    const errorMessage = error?.message || 'Erreur inconnue';

    if (__DEV__) {
      console.error('[getPartner] ❌ Erreur lors de la récupération de', id);
      console.error('[getPartner] Message:', errorMessage);
    }

    throw new Error(`Impossible de charger le partenaire ${id}: ${errorMessage}`);
  }
}
