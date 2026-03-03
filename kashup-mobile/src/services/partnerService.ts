import apiClient from './apiClient';

/**
 * Endpoints utilisés :
 * - GET /partners : liste paginée/filtrable des partenaires
 * - GET /partners/:id : fiche détaillée d’un partenaire
 * - GET /partners/categories/list : catalogue des catégories disponibles
 */

export type PartnerCategory = {
  id: string;
  name: string;
};

export type PartnerFilters = {
  search?: string;
  categoryId?: string;
  territoire?: 'Martinique' | 'Guadeloupe' | 'Guyane';
  autourDeMoi?: string;
};

export type Partner = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  shortDescription?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  openingDays?: string[] | null;
  address?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tauxCashbackBase: number;
  discoveryCashbackRate?: number | null;
  permanentCashbackRate?: number | null;
  pointsPerTransaction?: number | null;
  territory?: string;
  territories?: string[];
  latitude?: number | null;
  longitude?: number | null;
  boostable: boolean;
  categoryId?: string;
  category?: PartnerCategory;
  marketingPrograms?: Array<'pepites' | 'boosted' | 'most-searched'>;
  /** URLs des photos du partenaire (la première peut servir d'image hero) */
  photos?: string[];
};

/** Normalise un partenaire reçu de l'API (category.id → categoryId, territories[0] → territory) */
function normalizePartner(p: Partner): Partner {
  return {
    ...p,
    categoryId: p.categoryId ?? p.category?.id ?? '',
    territory: p.territory ?? (Array.isArray(p.territories) ? p.territories[0] : undefined) ?? 'Martinique',
  };
}

/**
 * Récupère tous les partenaires en gérant la pagination automatiquement
 * L'API retourne { partners: Partner[] } dans data, donc on doit extraire partners
 */
export const getPartners = async (filters?: PartnerFilters): Promise<Partner[]> => {
  const allPartners: Partner[] = [];
  let page = 1;
  const pageSize = 200; // Maximum autorisé par l'API
  let hasMore = true;
  const endpoint = '/partners';

  if (__DEV__) {
    console.log('[getPartners] 🚀 Démarrage récupération partenaires');
    console.log('[getPartners] 📍 Endpoint:', endpoint);
    console.log('[getPartners] 🔍 Filtres:', filters || 'aucun');
  }

  try {
    while (hasMore) {
      const params = {
        ...filters,
        page,
        pageSize,
      };

      if (__DEV__) {
        console.log(`[getPartners] 📄 Page ${page}, pageSize: ${pageSize}`);
      }

      const response = await apiClient.get<{ partners: Partner[] } | Partner[]>(endpoint, {
        params
      });

      if (__DEV__) {
        console.log(`[getPartners] ✅ Réponse reçue pour page ${page}`);
        console.log(`[getPartners] 📊 Format data:`, typeof response.data, Array.isArray(response.data) ? 'array' : 'object');
      }

      // Extraire le tableau de partenaires (plusieurs formats possibles selon la couche de réponse)
      let rawPartners: Partner[] = [];
      const data = response?.data;

      if (data && typeof data === 'object') {
        if ('partners' in data && Array.isArray((data as { partners: Partner[] }).partners)) {
          rawPartners = (data as { partners: Partner[] }).partners;
        } else if ('data' in data && typeof (data as any).data === 'object' && (data as any).data !== null && 'partners' in (data as any).data) {
          rawPartners = ((data as any).data as { partners: Partner[] }).partners ?? [];
        } else if (Array.isArray(data)) {
          rawPartners = data;
        }
      }
      if (!Array.isArray(rawPartners)) {
        rawPartners = [];
      }

      if (rawPartners.length > 0) {
        const normalized = rawPartners.map(normalizePartner);
        allPartners.push(...normalized);
        if (__DEV__) {
          console.log(`[getPartners] 📦 ${normalized.length} partenaires récupérés sur cette page`);
        }
        hasMore = rawPartners.length === pageSize;
        page++;
      } else if (page === 1 || allPartners.length > 0) {
        if (__DEV__) {
          console.log(`[getPartners] 📦 0 partenaire sur cette page (fin de liste)`);
        }
        hasMore = false;
      } else {
        if (__DEV__) {
          console.warn('[getPartners] ⚠️ Format de réponse inattendu, keys:', data && typeof data === 'object' ? Object.keys(data) : 'n/a');
        }
        hasMore = false;
      }
    }

    if (__DEV__) {
      console.log(`[getPartners] ✅ Récupération terminée: ${allPartners.length} partenaires au total`);
      console.log(`[getPartners] 📋 Noms:`, allPartners.slice(0, 5).map(p => p.name).join(', '), allPartners.length > 5 ? '...' : '');
    }

    return allPartners;
  } catch (error: any) {
    // Gestion d'erreur améliorée
    const errorMessage = error?.message || 'Erreur inconnue';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('exceeded') || error?.code === 'ECONNABORTED';
    
    if (__DEV__) {
      console.error('[getPartners] ❌ Erreur lors de la récupération:', errorMessage);
      console.error('[getPartners] 🔍 Type erreur:', isTimeout ? 'TIMEOUT' : 'AUTRE');
      console.error('[getPartners] 📍 Endpoint tenté:', endpoint);
    }

    if (isTimeout) {
      throw new Error(`L'API ne répond pas dans les temps (timeout). Vérifiez que le serveur est démarré et accessible.`);
    }

    // Relancer l'erreur originale
    throw error;
  }
};

export const getPartnerById = async (id: string): Promise<Partner> => {
  const { data } = await apiClient.get<Partner>(`/partners/${id}`);
  if (!data || typeof data !== 'object') {
    throw new Error('Partenaire introuvable');
  }
  return normalizePartner(data as Partner);
};

/** Cache des catégories (TTL 1 min) - évite les appels redondants tout en restant à jour avec le back office */
let _categoriesCache: { data: PartnerCategory[]; expires: number } | null = null;
const CATEGORIES_CACHE_TTL_MS = 60 * 1000;

/** Invalide le cache des catégories (à appeler avant un refetch pour voir les données du back office) */
export const invalidateCategoriesCache = (): void => {
  _categoriesCache = null;
};

export const getPartnerCategories = async (): Promise<PartnerCategory[]> => {
  const now = Date.now();
  if (_categoriesCache && _categoriesCache.expires > now) {
    return _categoriesCache.data;
  }
  const { data } = await apiClient.get<PartnerCategory[] | string[]>('/partners/categories/list');
  if (!data || !Array.isArray(data)) return [];
  // API peut retourner { id, name }[] ou string[] (noms seuls)
  const categories = data.map((item): PartnerCategory => {
    if (typeof item === 'string') {
      return { id: item, name: item };
    }
    return { id: item.id, name: item.name };
  });
  _categoriesCache = { data: categories, expires: now + CATEGORIES_CACHE_TTL_MS };
  return categories;
};

