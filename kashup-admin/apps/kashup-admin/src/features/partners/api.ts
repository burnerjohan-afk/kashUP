import { z } from 'zod';
import { getJson, patchJson, postJson, getStandardJson, postStandardJson, deleteStandardJson } from '@/lib/api/client';
import { unwrapResponse, unwrapStandardResponse } from '@/lib/api/response';
import type { Offer, Partner, Territory } from '@/types/entities';
import { normalizeCategories } from '@/lib/utils/slug';
import { normalizeImageUrl, normalizeImageFields } from '@/lib/utils/normalizeUrl';
import { getResource, getResourceById, createResource, updateResource } from '@/lib/api/resource-client';
import { API_CONFIG } from '@/config/api';

export type PartnersFilters = {
  category?: string;
  categoryId?: string; // CUID de la catégorie (alternative à category)
  territory?: Territory | 'all';
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'tauxCashbackBase' | 'transactionGrowth' | 'averageBasketGrowth';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

/**
 * Type pour la réponse paginée des partenaires
 */
export type PartnersResponse = {
  partners: Partner[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/** Convertit NaN (champ number vide avec valueAsNumber) en 0 pour la validation */
const optionalNumber = (min = 0, max?: number) =>
  z.preprocess(
    (val) => (typeof val === 'number' && Number.isNaN(val)) ? 0 : val,
    (max !== undefined ? z.number().min(min).max(max) : z.number().min(min)).optional()
  );

export const partnerFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  siret: z.string().optional(),
  phone: z.string().optional(),
  category: z.string().optional(), // Pour compatibilité
  categories: z.array(z.string()).min(1, 'Au moins une catégorie doit être sélectionnée'),
  territories: z.array(z.enum(['martinique', 'guadeloupe', 'guyane'])).min(1, 'Au moins un territoire doit être sélectionné'),
  status: z.enum(['active', 'inactive', 'pending']),
  logo: z.instanceof(File).optional(),
  kbis: z.instanceof(File).optional(),
  discoveryCashbackRate: optionalNumber(0, 100),
  permanentCashbackRate: optionalNumber(0, 100),
  welcomeAffiliationAmount: optionalNumber(0),
  permanentAffiliationAmount: optionalNumber(0),
  welcomeUserRate: optionalNumber(0, 100),
  welcomeKashUPRate: optionalNumber(0, 100),
  permanentUserRate: optionalNumber(0, 100),
  permanentKashUPRate: optionalNumber(0, 100),
  giftCardEnabled: z.boolean().optional(),
  giftCardCashbackRate: optionalNumber(0, 100),
  giftCardDescription: z.string().optional(),
  giftCardImage: z.instanceof(File).optional(),
  giftCardVirtualCardImage: z.instanceof(File).optional(),
  boostEnabled: z.boolean().optional(),
  boostRate: optionalNumber(0, 100),
  address: z.string().optional(),
  pointsPerTransaction: optionalNumber(0),
  marketingPrograms: z.array(z.enum(['pepites', 'boosted', 'most-searched'])).optional(),
  // Informations supplémentaires
  openingHoursStart: z.string().optional(),
  openingHoursEnd: z.string().optional(),
  openingDays: z
    .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
    .optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  /** Adresses et réseaux par département : { Martinique: { address, websiteUrl, ... }, Guadeloupe: {...}, Guyane: {...} } */
  territoryDetails: z.record(z.string(), z.object({
    address: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    facebookUrl: z.string().url().optional().or(z.literal('')),
    instagramUrl: z.string().url().optional().or(z.literal('')),
  }).passthrough()).optional(),
  menuImages: z.array(z.instanceof(File)).optional(),
  photos: z.array(z.instanceof(File)).optional(),
});

export type PartnerFormInput = z.infer<typeof partnerFormSchema>;

export const offerFormSchema = z.object({
  partnerId: z.string().min(1),
  title: z.string().min(3),
  startAt: z.string(),
  endAt: z.string(),
  capping: z.number().positive(),
  cashbackRate: z.number().min(1).max(50),
});

export type OfferFormInput = z.infer<typeof offerFormSchema>;

/**
 * Récupère la liste des partenaires avec filtres
 * 
 * ENDPOINT: GET /partners
 * 
 * FORMAT DE RÉPONSE: StandardResponse<PartnerDTO[]>
 * 
 * QUERY PARAMS (tous optionnels):
 * - territory?: 'martinique' | 'guadeloupe' | 'guyane' | 'all' (si 'all' ou undefined, non envoyé)
 * - category?: string (si chaîne vide, non envoyé)
 * - categoryId?: string (CUID de la catégorie, alternative à category)
 * - search?: string (si chaîne vide, non envoyé)
 * - sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'tauxCashbackBase' (défaut: 'name')
 * - sortOrder?: 'asc' | 'desc' (défaut: 'desc')
 * - page?: number (défaut: 1)
 * - limit?: number (défaut: 20, max: 100)
 * 
 * NOTE: Les paramètres vides ou 'all' ne sont PAS envoyés pour éviter les erreurs 400/500
 * Le nettoyage est fait automatiquement par getStandardJson()
 */
export const fetchPartners = async (filters: PartnersFilters): Promise<PartnersResponse> => {
  // Préparer les paramètres (le nettoyage sera fait par getStandardJson)
  // IMPORTANT: Ne pas envoyer de filtres par défaut qui pourraient exclure des partenaires
  const searchParams: Record<string, string | number | undefined | null> = {
    // Ne pas envoyer territory si 'all' (sera nettoyé par cleanSearchParams)
    territory: filters.territory && filters.territory !== 'all' ? filters.territory : undefined,
    // Ne pas envoyer category si vide (sera nettoyé par cleanSearchParams)
    category: filters.category && filters.category.trim() !== '' ? filters.category : undefined,
    categoryId: filters.categoryId, // Support du nouveau paramètre categoryId
    // Ne pas envoyer search si vide (sera nettoyé par cleanSearchParams)
    search: filters.search && filters.search.trim() !== '' ? filters.search : undefined,
    sortBy: filters.sortBy || 'updatedAt', // Trier par date de mise à jour par défaut (plus fiable que createdAt)
    sortOrder: filters.sortOrder || 'desc', // Décroissant = plus récents en premier
    page: filters.page || 1,
    // En développement, augmenter la limite pour voir tous les partenaires
    limit: filters.limit || (import.meta.env.DEV ? 1000 : 100), // Limite très élevée en dev pour voir tous les partenaires
    // IMPORTANT: Ne pas filtrer par status par défaut - afficher TOUS les partenaires
    // status: undefined, // Ne pas envoyer de filtre status
  };
  
  // Nettoyer les paramètres avant envoi
  const cleanedParams = Object.fromEntries(
    Object.entries(searchParams).filter(([_, value]) => 
      value !== undefined && value !== null && value !== ''
    )
  );
  
  if (import.meta.env.DEV) {
    console.log('📤 Paramètres envoyés à GET /partners:', cleanedParams);
    console.log('🔗 URL complète:', `${API_CONFIG.baseURL}/admin/partners`);
  }
  
  // Utiliser le helper getResource qui gère automatiquement le fallback admin/public
  const response = await getResource<Partner[]>('partners', cleanedParams);
  
  if (import.meta.env.DEV) {
    // Log détaillé pour déboguer les logos
    const firstPartner = Array.isArray(response.data) 
      ? response.data[0] 
      : (response.data && typeof response.data === 'object' && 'partners' in response.data && Array.isArray((response.data as any).partners))
        ? (response.data as any).partners[0]
        : null;
    
    console.log('📥 Réponse brute de GET /partners:', {
      statusCode: response.statusCode,
      success: response.success,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
      data: response.data, // Afficher la réponse brute complète
      pagination: response.meta?.pagination,
      meta: response.meta,
      message: response.message,
      firstPartnerLogo: firstPartner ? {
        hasLogo: !!(firstPartner as any).logo,
        hasLogoUrl: !!(firstPartner as any).logoUrl,
        logo: (firstPartner as any).logo,
        logoUrl: (firstPartner as any).logoUrl,
        allKeys: Object.keys(firstPartner),
      } : null,
    });
    
    // Afficher tous les IDs et noms des partenaires reçus
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('📋 Liste complète des partenaires reçus:', 
        response.data.map(p => ({ 
          id: p.id, 
          name: p.name, 
          status: p.status,
          createdAt: (p as any).createdAt,
          updatedAt: (p as any).updatedAt,
        }))
      );
    }
  }
  
  // Si la réponse n'est pas un succès, lancer une erreur pour que React Query la gère
  if (!response.success) {
    let errorMessage = response.message;
    
    // Améliorer le message d'erreur pour les erreurs de connexion
    if (response.statusCode === 0) {
      errorMessage = `Impossible de contacter le serveur. Vérifiez que l'API backend est démarrée et accessible sur ${API_CONFIG.baseURL}.`;
    } else {
      errorMessage = errorMessage || `Erreur ${response.statusCode} lors de la récupération des partenaires`;
    }
    
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la récupération des partenaires:', {
        statusCode: response.statusCode,
        message: errorMessage,
        response,
      });
    }
    throw new Error(errorMessage);
  }
  
  // IMPORTANT: L'API peut retourner data de différentes façons :
  // 1. data: Partner[] (tableau direct)
  // 2. data: { partners: Partner[] } (objet avec clé partners)
  // 3. data: null/undefined (aucune donnée)
  // Il faut gérer tous ces cas
  
  let data: Partner[] = [];
  let rawData: unknown = response.data;
  
  if (rawData === null || rawData === undefined) {
    // L'API a retourné success: true mais data est null/undefined
    // Pour une liste, cela signifie "aucun élément", donc on retourne []
    if (import.meta.env.DEV) {
      console.warn('⚠️ API a retourné success: true mais data est null/undefined, utilisation d\'un tableau vide');
    }
    data = [];
  } else if (Array.isArray(rawData)) {
    // Cas 1: data est directement un tableau
    data = rawData;
    if (import.meta.env.DEV) {
      console.log('✅ Data est directement un tableau:', data.length, 'partenaires');
    }
  } else if (typeof rawData === 'object' && rawData !== null) {
    // Cas 2: data est un objet, vérifier s'il contient une propriété 'partners'
    const dataObj = rawData as Record<string, unknown>;
    
    if ('partners' in dataObj && Array.isArray(dataObj.partners)) {
      // L'API retourne { partners: [...] }
      data = dataObj.partners as Partner[];
      if (import.meta.env.DEV) {
        console.log('✅ Data contient une propriété "partners":', data.length, 'partenaires');
        console.log('📦 Structure complète de data:', Object.keys(dataObj));
      }
    } else if ('data' in dataObj && Array.isArray(dataObj.data)) {
      // L'API retourne { data: [...] } (double nesting)
      data = dataObj.data as Partner[];
      if (import.meta.env.DEV) {
        console.log('✅ Data contient une propriété "data":', data.length, 'partenaires');
      }
    } else {
      // Objet mais pas de structure attendue
      if (import.meta.env.DEV) {
        console.warn('⚠️ API a retourné data qui est un objet mais sans structure attendue:', {
          keys: Object.keys(dataObj),
          data: dataObj,
        });
      }
      data = [];
    }
  } else {
    // Type inattendu
    if (import.meta.env.DEV) {
      console.warn('⚠️ API a retourné data d\'un type inattendu:', typeof rawData, rawData);
    }
    data = [];
  }
  
  // Extraire la pagination depuis meta.pagination ou data.pagination
  const pagination = response.meta?.pagination || 
    (typeof rawData === 'object' && rawData !== null && 'pagination' in rawData 
      ? (rawData as { pagination?: unknown }).pagination 
      : undefined);
  
  // Transformer les partenaires si category ou territory sont des objets
  // Le nouveau format PartnerDTO peut avoir category comme objet { id, name }
  // IMPORTANT: Ne filtrer AUCUN partenaire - tous doivent être inclus
  // Ne pas utiliser .filter() qui exclurait des partenaires
  const partners = (Array.isArray(data) ? data : []).map((partner, index) => {
    // S'assurer que le partenaire a au moins un id
    // Si pas d'id, générer un id temporaire plutôt que d'exclure
    if (!partner || !partner.id) {
      if (import.meta.env.DEV) {
        console.warn(`⚠️ Partenaire sans ID à l'index ${index}:`, partner);
      }
      // Créer un partenaire minimal avec un ID temporaire plutôt que de l'exclure
      const tempId = `temp-${Date.now()}-${index}`;
      return {
        ...partner,
        id: tempId,
        name: partner?.name || 'Partenaire sans nom',
        status: (partner?.status || 'pending') as 'active' | 'inactive' | 'pending',
      } as Partner;
    }
    
    const transformed: Partner = { ...partner };
    
    // Normaliser les URLs d'images en utilisant le helper
    const normalizedPartner = normalizeImageFields(partner, 'logoUrl');
    if (normalizedPartner.logoUrl) {
      transformed.logoUrl = normalizedPartner.logoUrl as string;
      
      if (import.meta.env.DEV && partner.id) {
        console.log('✅ Logo URL normalisée:', { 
          partenaire: partner.name || partner.id,
          original: (partner as any).logoUrl || (partner as any).logo || (partner as any).logoPath,
          normalized: transformed.logoUrl 
        });
      }
    } else if (import.meta.env.DEV) {
      console.warn('⚠️ Aucun logo trouvé pour le partenaire:', {
        id: partner.id,
        name: partner.name,
        allPartnerKeys: Object.keys(partner),
      });
    }
    
    // S'assurer que le nom existe et n'est PAS traduit
    if (!transformed.name) {
      transformed.name = 'Partenaire sans nom';
    } else {
      // S'assurer que le nom reste tel quel (pas de traduction)
      transformed.name = String(transformed.name);
    }
    
    // S'assurer que le status existe
    if (!transformed.status) {
      transformed.status = 'pending';
    }
    
    // Transformer category si c'est un objet
    if (partner.category && typeof partner.category === 'object' && 'name' in partner.category) {
      transformed.category = (partner.category as { id: string; name: string }).name;
    }
    // Remplir categories à partir de category pour que le formulaire pré-coche la catégorie
    if (!transformed.categories || transformed.categories.length === 0) {
      transformed.categories = transformed.category ? [transformed.category] : [];
    }
    
    // Transformer territory si c'est un objet
    if (partner.territory && typeof partner.territory === 'object' && 'name' in partner.territory) {
      transformed.territory = (partner.territory as { id: string; name: string }).name as Territory;
    }
    
    // Transformer territories si ce sont des objets
    if (partner.territories && Array.isArray(partner.territories)) {
      transformed.territories = partner.territories.map((t) => 
        typeof t === 'string' 
          ? t 
          : (t as { id: string; name: string }).name as Territory
      );
    }
    
    // S'assurer que categories existe (même si vide)
    if (!transformed.categories) {
      transformed.categories = [];
    }
    
    // S'assurer que territories existe (même si vide)
    if (!transformed.territories) {
      transformed.territories = [];
    }
    
    return transformed;
  });
  
  if (import.meta.env.DEV) {
    console.log('✅ Partenaires transformés:', {
      count: partners.length,
      totalFromAPI: data.length,
      rawDataStructure: typeof rawData === 'object' && rawData !== null ? Object.keys(rawData as object) : typeof rawData,
      partners: partners.map(p => ({ 
        id: p.id, 
        name: p.name, 
        status: p.status,
        createdAt: (p as any).createdAt,
        updatedAt: (p as any).updatedAt,
      })),
      pagination,
    });
    
    // Vérifier s'il y a une différence entre le nombre reçu et le nombre transformé
    if (data.length !== partners.length) {
      console.warn(`⚠️ ATTENTION: ${data.length} partenaires reçus mais ${partners.length} transformés`);
    } else if (data.length > 0) {
      console.log(`✅ ${data.length} partenaires correctement extraits et transformés`);
    }
  }
  
  // Type guard pour la pagination
  const hasPagination = pagination && typeof pagination === 'object' && 
    'page' in pagination && 'limit' in pagination && 'total' in pagination;
  
  return {
    partners,
    pagination: hasPagination ? {
      page: (pagination as { page: number }).page,
      limit: (pagination as { limit: number }).limit,
      total: (pagination as { total: number }).total,
      totalPages: (pagination as { totalPages?: number }).totalPages ?? Math.ceil((pagination as { total: number }).total / (pagination as { limit: number }).limit),
      hasNext: (pagination as { hasNext?: boolean }).hasNext ?? false,
      hasPrev: (pagination as { hasPrev?: boolean }).hasPrev ?? false,
    } : undefined,
  };
};

/**
 * Récupère un partenaire par son ID
 * 
 * ENDPOINT: GET /api/v1/admin/partners/:id (ou GET /api/v1/partners/:id en fallback)
 * 
 * FORMAT DE RÉPONSE: StandardResponse<PartnerDTO>
 */
export const fetchPartnerById = async (id: string) => {
  const response = await getResourceById<Partner>('partners', id);
  const partner = unwrapStandardResponse(response);
  
  // Transformer le partenaire si category ou territory sont des objets
  const transformed: Partner = { ...partner };
  
  // Transformer category si c'est un objet (nouveau format PartnerDTO)
  if (partner.category && typeof partner.category === 'object' && 'name' in partner.category) {
    transformed.category = (partner.category as { id: string; name: string }).name;
  }
  // Remplir categories pour que le formulaire pré-coche la catégorie au chargement
  if (!transformed.categories || transformed.categories.length === 0) {
    transformed.categories = transformed.category ? [transformed.category] : [];
  }
  
  // Transformer territory si c'est un objet (ancien format)
  if (partner.territory && typeof partner.territory === 'object' && 'name' in partner.territory) {
    transformed.territory = (partner.territory as { id: string; name: string }).name as Territory;
  }
  
  // Transformer territories si ce sont des objets (nouveau format)
  // IMPORTANT: Ne PAS convertir en minuscules - garder la casse originale
  // Le backend peut retourner "Martinique", "martinique", etc. - on garde tel quel
  if (partner.territories && Array.isArray(partner.territories)) {
    transformed.territories = partner.territories.map((t) => {
      if (typeof t === 'string') {
        // Vérifier si c'est déjà un slug valide (tout en minuscules)
        const lowerT = t.toLowerCase();
        if (lowerT === 'martinique' || lowerT === 'guadeloupe' || lowerT === 'guyane') {
          return lowerT as Territory;
        }
        // Sinon, garder la valeur originale
        return t as Territory;
      }
      // Si c'est un objet, extraire le nom et normaliser en slug
      const name = (t as { id: string; name: string }).name;
      const lowerName = name.toLowerCase();
      if (lowerName === 'martinique' || lowerName === 'guadeloupe' || lowerName === 'guyane') {
        return lowerName as Territory;
      }
      return name as Territory;
    });
  }
  
  // Normaliser openingDays (API peut retourner un array ou une string JSON)
  if (partner.openingDays !== undefined) {
    if (Array.isArray(partner.openingDays)) {
      transformed.openingDays = partner.openingDays;
    } else if (typeof partner.openingDays === 'string') {
      try {
        const parsed = JSON.parse(partner.openingDays);
        transformed.openingDays = Array.isArray(parsed) ? parsed : [];
      } catch {
        transformed.openingDays = [];
      }
    }
  }
  
  // Normaliser le logoUrl en utilisant le helper
  const normalizedPartner = normalizeImageFields(partner, 'logoUrl');
  if (normalizedPartner.logoUrl) {
    transformed.logoUrl = normalizedPartner.logoUrl as string;
    
    if (import.meta.env.DEV) {
      console.log('✅ Logo URL normalisée pour fetchPartnerById:', {
        original: partner.logoUrl,
        transformed: transformed.logoUrl,
      });
    }
  }

  // Mapper boostable (API) -> boostEnabled (formulaire back office) pour affichage des toggles
  if ((partner as { boostable?: boolean }).boostable !== undefined) {
    transformed.boostEnabled = (partner as { boostable?: boolean }).boostable;
  } else if ((partner as { boostEnabled?: boolean }).boostEnabled !== undefined) {
    transformed.boostEnabled = (partner as { boostEnabled?: boolean }).boostEnabled;
  } else {
    transformed.boostEnabled = false;
  }

  // S'assurer que giftCardEnabled est un booléen (API peut le retourner après ajout au modèle Partner)
  if ((partner as { giftCardEnabled?: boolean }).giftCardEnabled !== undefined) {
    transformed.giftCardEnabled = (partner as { giftCardEnabled?: boolean }).giftCardEnabled === true;
  } else if (transformed.giftCardEnabled === undefined) {
    transformed.giftCardEnabled = false;
  }
  
  return transformed;
};

/**
 * Récupère la liste des catégories de partenaires
 * 
 * ENDPOINT: GET /partners/categories
 * 
 * FORMAT DE RÉPONSE: StandardResponse<string[] | Array<{ id: string; name: string }>>
 */
export const fetchPartnerCategories = async (): Promise<string[]> => {
  const response = await getStandardJson<string[] | Array<{ id: string; name: string }>>('partners/categories');
  const data = unwrapStandardResponse(response);
  
  if (import.meta.env.DEV) {
    console.log('📋 Catégories reçues de l\'API:', {
      data,
      isArray: Array.isArray(data),
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      firstItemType: Array.isArray(data) && data.length > 0 ? typeof data[0] : null,
    });
  }
  
  // Si l'API retourne des objets avec id/name, extraire les noms
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object' && data[0] !== null && 'name' in data[0]) {
      const transformed = data.map((item) => (item as { id: string; name: string }).name);
      if (import.meta.env.DEV) {
        console.log('✅ Catégories transformées (objets -> strings):', transformed);
      }
      return transformed;
    }
  }
  
  // Sinon, retourner directement (déjà des strings)
  if (import.meta.env.DEV) {
    console.log('✅ Catégories déjà au bon format (strings):', data);
  }
  return data as string[];
};

export const fetchCurrentOffers = async () => {
  const response = await getJson<Offer[]>('offers/current');
  return unwrapResponse(response);
};

/**
 * Helper function to serialize PartnerFormInput to FormData
 * Handles all field types correctly: strings, numbers, booleans, arrays, and files
 */
const serializePartnerToFormData = (payload: PartnerFormInput): FormData => {
  const formData = new FormData();

  // Champs de base (obligatoires)
  formData.append('name', payload.name);
  
  // Catégories : normaliser les labels en slugs avant envoi
  // IMPORTANT: Toujours envoyer les catégories si présentes dans le payload
  if (payload.categories && payload.categories.length > 0) {
    const normalizedCategories = normalizeCategories(payload.categories);
    
    if (import.meta.env.DEV) {
      console.log('📋 Catégories normalisées:', {
        'Catégories UI (labels)': payload.categories,
        'Catégories API (slugs)': normalizedCategories,
        normalizedCount: normalizedCategories.length,
      });
    }
    
    if (normalizedCategories.length > 0) {
      // Format standard: categories répété (sans crochets) pour compatibilité maximale
      normalizedCategories.forEach(cat => {
        formData.append('categories', cat);
        if (import.meta.env.DEV) {
          console.log(`✅ Catégorie ajoutée au FormData: ${cat}`);
        }
      });
      // Envoyer aussi category pour compatibilité
      formData.append('category', normalizedCategories[0]);
      if (import.meta.env.DEV) {
        console.log(`✅ Category (singulier) ajouté au FormData: ${normalizedCategories[0]}`);
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('❌ Aucune catégorie valide après normalisation:', {
          original: payload.categories,
          normalized: normalizedCategories,
        });
      }
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Aucune catégorie dans le payload ou tableau vide:', {
        categories: payload.categories,
        hasCategories: 'categories' in payload,
        categoriesLength: payload.categories?.length || 0,
      });
    }
  }
  
  // Pour compatibilité avec l'ancien système, envoyer aussi category si fourni
  if (payload.category) {
    const normalizedCategory = normalizeCategories([payload.category])[0];
    if (normalizedCategory) {
      formData.append('category', normalizedCategory);
      if (import.meta.env.DEV) {
        console.log(`✅ Category (compatibilité) ajouté au FormData: ${normalizedCategory}`);
      }
    }
  }
  
  // Statut : TOUJOURS envoyer, c'est un champ obligatoire
  if (payload.status) {
    formData.append('status', payload.status);
    if (import.meta.env.DEV) {
      console.log(`✅ Statut ajouté au FormData: ${payload.status}`);
    }
  } else {
    if (import.meta.env.DEV) {
      console.error('❌ ERREUR: Statut manquant dans le payload!', payload);
    }
  }

  // Territoires : envoyer comme 'territories' répété (format standard multipart/form-data)
  // IMPORTANT: Normaliser en minuscules (slugs) pour le backend
  if (payload.territories && payload.territories.length > 0) {
    payload.territories.forEach(territory => {
      // Normaliser en minuscules pour correspondre aux slugs attendus par le backend
      const territoryValue = String(territory).toLowerCase();
      formData.append('territories', territoryValue);
      
      if (import.meta.env.DEV) {
        console.log(`✅ Territoire ajouté au FormData (create): ${territoryValue} (original: ${territory})`);
      }
    });
    
    if (import.meta.env.DEV) {
      console.log('📤 Territoires envoyés (create):', {
        original: payload.territories,
        normalized: payload.territories.map(t => String(t).toLowerCase()),
        count: payload.territories.length,
      });
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Aucun territoire dans le payload pour createPartner:', {
        hasTerritories: 'territories' in payload,
        territories: payload.territories,
        territoriesLength: payload.territories?.length || 0,
      });
    }
  }

  // Champs optionnels texte
  // IMPORTANT: Envoyer même les chaînes vides pour permettre de vider un champ
  if (payload.siret !== undefined) formData.append('siret', payload.siret || '');
  if (payload.phone !== undefined) formData.append('phone', payload.phone || '');
  if (payload.address !== undefined) formData.append('address', payload.address || '');
  if (payload.websiteUrl !== undefined) formData.append('websiteUrl', payload.websiteUrl || '');
  if (payload.instagramUrl !== undefined) formData.append('instagramUrl', payload.instagramUrl || '');
  if (payload.facebookUrl !== undefined) formData.append('facebookUrl', payload.facebookUrl || '');
  if (payload.giftCardDescription !== undefined) formData.append('giftCardDescription', payload.giftCardDescription || '');
  if (payload.territoryDetails && typeof payload.territoryDetails === 'object' && Object.keys(payload.territoryDetails).length > 0) {
    formData.append('territoryDetails', JSON.stringify(payload.territoryDetails));
  }

  // Fichiers
  // IMPORTANT: Envoyer le logo seulement si c'est un nouveau fichier (File)
  // Ne pas envoyer logoUrl - le backend le génère automatiquement
  if (payload.logo instanceof File) {
    formData.append('logo', payload.logo);
    if (import.meta.env.DEV) {
      console.log('✅ Fichier logo ajouté au FormData (création):', { 
        name: payload.logo.name, 
        size: payload.logo.size,
        type: payload.logo.type,
        lastModified: new Date(payload.logo.lastModified).toISOString(),
      });
    }
  } else {
    if (import.meta.env.DEV) {
      if (payload.logo !== undefined) {
        console.warn('⚠️ payload.logo présent mais n\'est pas un File (création):', {
          type: typeof payload.logo,
          value: payload.logo,
          isNull: payload.logo === null,
          isUndefined: payload.logo === undefined,
        });
      } else {
        console.log('ℹ️ Aucun logo à envoyer lors de la création (payload.logo est undefined)');
      }
    }
  }
  
  if (payload.kbis instanceof File) formData.append('kbis', payload.kbis);
  if (payload.giftCardImage) formData.append('giftCardImage', payload.giftCardImage);
  if (payload.giftCardVirtualCardImage) formData.append('giftCardVirtualCardImage', payload.giftCardVirtualCardImage);

  // Fichiers multiples
  if (payload.menuImages && payload.menuImages.length > 0) {
    payload.menuImages.forEach((file) => {
      formData.append('menuImages', file);
    });
  }
  if (payload.photos && payload.photos.length > 0) {
    payload.photos.forEach((file) => {
      formData.append('photos', file);
    });
  }

  // Champs numériques
  if (payload.discoveryCashbackRate !== undefined && payload.discoveryCashbackRate !== null) {
    formData.append('discoveryCashbackRate', payload.discoveryCashbackRate.toString());
  }
  if (payload.permanentCashbackRate !== undefined && payload.permanentCashbackRate !== null) {
    formData.append('permanentCashbackRate', payload.permanentCashbackRate.toString());
  }
  if (payload.welcomeAffiliationAmount !== undefined && payload.welcomeAffiliationAmount !== null) {
    formData.append('welcomeAffiliationAmount', payload.welcomeAffiliationAmount.toString());
  }
  if (payload.permanentAffiliationAmount !== undefined && payload.permanentAffiliationAmount !== null) {
    formData.append('permanentAffiliationAmount', payload.permanentAffiliationAmount.toString());
  }
  if (payload.welcomeUserRate !== undefined && payload.welcomeUserRate !== null) {
    formData.append('welcomeUserRate', payload.welcomeUserRate.toString());
  }
  if (payload.welcomeKashUPRate !== undefined && payload.welcomeKashUPRate !== null) {
    formData.append('welcomeKashUPRate', payload.welcomeKashUPRate.toString());
  }
  if (payload.permanentUserRate !== undefined && payload.permanentUserRate !== null) {
    formData.append('permanentUserRate', payload.permanentUserRate.toString());
  }
  if (payload.permanentKashUPRate !== undefined && payload.permanentKashUPRate !== null) {
    formData.append('permanentKashUPRate', payload.permanentKashUPRate.toString());
  }
  if (payload.giftCardCashbackRate !== undefined && payload.giftCardCashbackRate !== null) {
    formData.append('giftCardCashbackRate', payload.giftCardCashbackRate.toString());
  }
  if (payload.boostRate !== undefined && payload.boostRate !== null) {
    formData.append('boostRate', payload.boostRate.toString());
  }
  if (payload.pointsPerTransaction !== undefined && payload.pointsPerTransaction !== null) {
    formData.append('pointsPerTransaction', payload.pointsPerTransaction.toString());
  }

  // Champs booléens
  if (payload.giftCardEnabled !== undefined) {
    formData.append('giftCardEnabled', payload.giftCardEnabled ? 'true' : 'false');
  }
  if (payload.boostEnabled !== undefined) {
    formData.append('boostEnabled', payload.boostEnabled ? 'true' : 'false');
  }

  // Arrays : marketingPrograms doit être envoyé comme JSON string selon la spec
  // IMPORTANT: Envoyer même si le tableau est vide pour permettre de vider le champ
  if (payload.marketingPrograms !== undefined) {
    if (payload.marketingPrograms.length > 0) {
      formData.append('marketingPrograms', JSON.stringify(payload.marketingPrograms));
    } else {
      // Envoyer un tableau vide en JSON pour vider le champ
      formData.append('marketingPrograms', JSON.stringify([]));
    }
  }
  
  // openingDays peut rester comme array individuel ou JSON string selon l'API
  // IMPORTANT: Envoyer même si le tableau est vide pour permettre de vider le champ
  if (payload.openingDays !== undefined) {
    if (payload.openingDays.length > 0) {
      payload.openingDays.forEach((day) => {
        formData.append('openingDays[]', day);
      });
    } else {
      // Certains backends acceptent un champ vide pour vider, d'autres non
      // On n'envoie rien si le tableau est vide (comportement par défaut)
      if (import.meta.env.DEV) {
        console.log('ℹ️ openingDays est un tableau vide, non envoyé');
      }
    }
  }
  
  if (import.meta.env.DEV) {
    console.log('📅 Champs horaires et arrays dans le payload (createPartner):', {
      openingHoursStart: payload.openingHoursStart,
      openingHoursEnd: payload.openingHoursEnd,
      openingDays: payload.openingDays,
      marketingPrograms: payload.marketingPrograms,
    });
  }

  // Horaires d'ouverture
  // IMPORTANT: Envoyer même les chaînes vides pour permettre de vider un champ
  if (payload.openingHoursStart !== undefined) {
    formData.append('openingHoursStart', payload.openingHoursStart || '');
  }
  if (payload.openingHoursEnd !== undefined) {
    formData.append('openingHoursEnd', payload.openingHoursEnd || '');
  }

  return formData;
};

/**
 * Crée un nouveau partenaire
 * 
 * ENDPOINT: POST /admin/partners (ou POST /partners selon la configuration)
 * 
 * FORMAT: multipart/form-data (Content-Type géré automatiquement par le navigateur)
 * 
 * FORMAT DE RÉPONSE: StandardResponse<PartnerDTO>
 * 
 * CHAMPS IMPORTANTS:
 * - territories: JSON string array ["martinique"] ou ["martinique", "guadeloupe"]
 * - marketingPrograms: JSON string array ["pepites", "boosted"]
 * - categories: JSON string array ["restauration", "loisir"] (slugs uniquement)
 */
export const createPartner = async (payload: PartnerFormInput) => {
  // Log AVANT normalisation pour voir tous les champs présents
  if (import.meta.env.DEV) {
    console.log('📋 Payload reçu pour createPartner (COMPLET):', {
      // Informations principales
      name: payload.name,
      siret: payload.siret,
      phone: payload.phone,
      address: payload.address,
      categories: payload.categories,
      territories: payload.territories,
      // Réseaux sociaux
      instagramUrl: payload.instagramUrl,
      facebookUrl: payload.facebookUrl,
      // Horaires
      openingHoursStart: payload.openingHoursStart,
      openingHoursEnd: payload.openingHoursEnd,
      openingDays: payload.openingDays,
      // Affiliations et taux
      discoveryCashbackRate: payload.discoveryCashbackRate,
      permanentCashbackRate: payload.permanentCashbackRate,
      welcomeAffiliationAmount: payload.welcomeAffiliationAmount,
      permanentAffiliationAmount: payload.permanentAffiliationAmount,
      welcomeUserRate: payload.welcomeUserRate,
      welcomeKashUPRate: payload.welcomeKashUPRate,
      permanentUserRate: payload.permanentUserRate,
      permanentKashUPRate: payload.permanentKashUPRate,
      // Logo
      hasLogo: 'logo' in payload,
      logoType: payload.logo ? typeof payload.logo : 'undefined',
      logoIsFile: payload.logo instanceof File,
      // Marketing
      marketingPrograms: payload.marketingPrograms,
      // Tous les clés
      allKeys: Object.keys(payload),
    });
  }
  
  // Normaliser les catégories avant sérialisation
  const normalizedPayload = {
    ...payload,
    categories: payload.categories ? normalizeCategories(payload.categories) : [],
  };

  if (import.meta.env.DEV) {
    console.log('📋 Payload après normalisation des catégories:', {
      'Catégories UI (labels)': payload.categories,
      'Catégories normalisées (slugs)': normalizedPayload.categories,
      hasLogo: 'logo' in normalizedPayload,
      logoIsFile: normalizedPayload.logo instanceof File,
    });
  }

  const formData = serializePartnerToFormData(normalizedPayload);

  if (import.meta.env.DEV) {
    // Log les données envoyées (sans les fichiers pour éviter le spam)
    const formDataEntries: Record<string, string> = {};
    const formDataArray: Array<{ key: string; value: string }> = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        formDataEntries[key] = `[File: ${value.name}, ${value.size} bytes]`;
        formDataArray.push({ key, value: `[File: ${value.name}, ${value.size} bytes]` });
      } else {
        formDataEntries[key] = String(value);
        formDataArray.push({ key, value: String(value) });
      }
    }
    console.log('📤 Données envoyées au backend (createPartner):', formDataEntries);
    console.log('📋 Format FormData (ordre):', formDataArray);
    
    // Vérification CRITIQUE des champs obligatoires et importants
    console.log('🔍 Vérification CRITIQUE des champs dans FormData:', {
      // Champs obligatoires
      name: {
        hasName: formDataArray.some(e => e.key === 'name'),
        nameValue: formDataArray.find(e => e.key === 'name')?.value,
      },
      status: {
        hasStatus: formDataArray.some(e => e.key === 'status'),
        statusValue: formDataArray.find(e => e.key === 'status')?.value,
      },
      categories: {
        hasCategories: formDataArray.some(e => e.key === 'categories'),
        categoriesCount: formDataArray.filter(e => e.key === 'categories').length,
        categoriesValues: formDataArray.filter(e => e.key === 'categories').map(e => e.value),
        hasCategory: formDataArray.some(e => e.key === 'category'),
        categoryValue: formDataArray.find(e => e.key === 'category')?.value,
      },
      territories: {
        hasTerritories: formDataArray.some(e => e.key === 'territories'),
        territoriesCount: formDataArray.filter(e => e.key === 'territories').length,
        territoriesValues: formDataArray.filter(e => e.key === 'territories').map(e => e.value),
      },
      logo: {
        hasLogo: formDataArray.some(e => e.key === 'logo'),
        logoEntry: formDataArray.find(e => e.key === 'logo'),
        isFile: formDataArray.find(e => e.key === 'logo')?.value?.includes('[File:'),
      },
      informations: {
        hasSiret: formDataArray.some(e => e.key === 'siret'),
        siretValue: formDataArray.find(e => e.key === 'siret')?.value,
        hasPhone: formDataArray.some(e => e.key === 'phone'),
        phoneValue: formDataArray.find(e => e.key === 'phone')?.value,
        hasAddress: formDataArray.some(e => e.key === 'address'),
        addressValue: formDataArray.find(e => e.key === 'address')?.value,
        hasInstagramUrl: formDataArray.some(e => e.key === 'instagramUrl'),
        instagramUrlValue: formDataArray.find(e => e.key === 'instagramUrl')?.value,
        hasFacebookUrl: formDataArray.some(e => e.key === 'facebookUrl'),
        facebookUrlValue: formDataArray.find(e => e.key === 'facebookUrl')?.value,
      },
      horaires: {
        hasOpeningHoursStart: formDataArray.some(e => e.key === 'openingHoursStart'),
        openingHoursStartValue: formDataArray.find(e => e.key === 'openingHoursStart')?.value,
        hasOpeningHoursEnd: formDataArray.some(e => e.key === 'openingHoursEnd'),
        openingHoursEndValue: formDataArray.find(e => e.key === 'openingHoursEnd')?.value,
        hasOpeningDays: formDataArray.some(e => e.key === 'openingDays[]'),
        openingDaysCount: formDataArray.filter(e => e.key === 'openingDays[]').length,
        openingDaysValues: formDataArray.filter(e => e.key === 'openingDays[]').map(e => e.value),
      },
      affiliations: {
        hasDiscoveryCashbackRate: formDataArray.some(e => e.key === 'discoveryCashbackRate'),
        discoveryCashbackRateValue: formDataArray.find(e => e.key === 'discoveryCashbackRate')?.value,
        hasPermanentCashbackRate: formDataArray.some(e => e.key === 'permanentCashbackRate'),
        permanentCashbackRateValue: formDataArray.find(e => e.key === 'permanentCashbackRate')?.value,
        hasWelcomeAffiliationAmount: formDataArray.some(e => e.key === 'welcomeAffiliationAmount'),
        welcomeAffiliationAmountValue: formDataArray.find(e => e.key === 'welcomeAffiliationAmount')?.value,
        hasPermanentAffiliationAmount: formDataArray.some(e => e.key === 'permanentAffiliationAmount'),
        permanentAffiliationAmountValue: formDataArray.find(e => e.key === 'permanentAffiliationAmount')?.value,
        hasWelcomeUserRate: formDataArray.some(e => e.key === 'welcomeUserRate'),
        welcomeUserRateValue: formDataArray.find(e => e.key === 'welcomeUserRate')?.value,
        hasWelcomeKashUPRate: formDataArray.some(e => e.key === 'welcomeKashUPRate'),
        welcomeKashUPRateValue: formDataArray.find(e => e.key === 'welcomeKashUPRate')?.value,
        hasPermanentUserRate: formDataArray.some(e => e.key === 'permanentUserRate'),
        permanentUserRateValue: formDataArray.find(e => e.key === 'permanentUserRate')?.value,
        hasPermanentKashUPRate: formDataArray.some(e => e.key === 'permanentKashUPRate'),
        permanentKashUPRateValue: formDataArray.find(e => e.key === 'permanentKashUPRate')?.value,
      },
      allKeys: [...new Set(formDataArray.map(e => e.key))],
    });
    
    // Vérification finale : tous les champs critiques sont-ils présents ?
    const criticalFields = ['name', 'status'];
    const missingFields = criticalFields.filter(field => 
      !formDataArray.some(e => e.key === field)
    );
    if (missingFields.length > 0) {
      console.error('❌ CHAMPS CRITIQUES MANQUANTS dans FormData:', missingFields);
    } else {
      console.log('✅ Tous les champs critiques (name, status) sont présents dans FormData');
    }
    
    // Vérifier les catégories
    const hasCategories = formDataArray.some(e => e.key === 'categories' || e.key === 'category');
    if (!hasCategories) {
      console.error('❌ ERREUR: Aucune catégorie dans FormData!');
    } else {
      const categoriesCount = formDataArray.filter(e => e.key === 'categories').length;
      console.log(`✅ Catégories présentes dans FormData (${categoriesCount} catégorie(s))`);
    }
    
    // Vérifier les territoires
    const hasTerritories = formDataArray.some(e => e.key === 'territories');
    if (!hasTerritories) {
      console.error('❌ ERREUR: Aucun territoire dans FormData!');
    } else {
      const territoriesCount = formDataArray.filter(e => e.key === 'territories').length;
      console.log(`✅ Territoires présents dans FormData (${territoriesCount} territoire(s))`);
    }
    
    console.log('🌐 Endpoint appelé: POST /admin/partners');
  }

  // Utiliser le helper createResource qui gère automatiquement le fallback admin/public
  const response = await createResource<Partner>('partners', formData);
  const createdPartner = unwrapStandardResponse(response);
  
  // Normaliser le logoUrl si présent
  if (createdPartner.logoUrl) {
    const normalized = normalizeImageUrl(createdPartner.logoUrl);
    if (normalized) {
      createdPartner.logoUrl = normalized;
      
      if (import.meta.env.DEV) {
        console.log('✅ Logo URL normalisée pour createPartner:', {
          original: (response as any).data?.logoUrl || createdPartner.logoUrl,
          normalized: createdPartner.logoUrl,
        });
      }
    }
  }
  
  if (import.meta.env.DEV) {
    console.log('✅ Partenaire créé avec succès:', {
      id: createdPartner.id,
      name: createdPartner.name,
      hasLogoUrl: !!createdPartner.logoUrl,
      logoUrl: createdPartner.logoUrl,
    });
  }
  
  return createdPartner;
};

/**
 * Fonction helper pour sérialiser Partial<PartnerFormInput> en FormData pour les mises à jour
 * N'inclut que les champs réellement fournis (pas undefined/null)
 */
const serializePartnerUpdateToFormData = (payload: Partial<PartnerFormInput>): FormData => {
  const formData = new FormData();

  // IMPORTANT: Ne JAMAIS envoyer logoUrl dans le FormData
  // Le backend stocke le logo et génère l'URL automatiquement
  // On envoie uniquement le fichier 'logo' si on veut le changer
  
  // Champs de base
  if (payload.name !== undefined) formData.append('name', payload.name);
  
  // Catégories : normaliser les labels en slugs avant envoi
  // NOTE: Le backend peut attendre soit JSON stringifié soit format array[]
  // On utilise JSON stringifié par défaut, mais on peut essayer array[] si ça échoue
  if (payload.categories !== undefined && payload.categories.length > 0) {
    const normalizedCategories = normalizeCategories(payload.categories);
    
    if (import.meta.env.DEV) {
      console.log('📋 Catégories normalisées (update):', {
        'Catégories UI (labels)': payload.categories,
        'Catégories API (slugs)': normalizedCategories,
      });
    }
    
    if (normalizedCategories.length > 0) {
      // Essayer plusieurs formats pour compatibilité avec différents backends
      // Format 1: categories répété (format standard multipart/form-data)
      normalizedCategories.forEach(cat => formData.append('categories', cat));
      
      // Format 2: category (singulier) avec la première catégorie pour compatibilité
      formData.append('category', normalizedCategories[0]);
      
      // Format 3: categories[] (certains backends l'attendent avec crochets)
      // Décommenter si nécessaire
      // normalizedCategories.forEach(cat => formData.append('categories[]', cat));
      
      if (import.meta.env.DEV) {
        console.log('📤 Catégories envoyées dans 3 formats:', {
          categories: normalizedCategories,
          category: normalizedCategories[0],
        });
      }
    }
  }
  
  // Pour compatibilité avec l'ancien système (si category est fourni directement)
  if (payload.category !== undefined && (!payload.categories || payload.categories.length === 0)) {
    const normalizedCategory = normalizeCategories([payload.category])[0];
    if (normalizedCategory) {
      formData.append('category', normalizedCategory);
    }
  }
  
  if (payload.status !== undefined) formData.append('status', payload.status);

  // Territoires : envoyer dans plusieurs formats pour compatibilité
  // IMPORTANT: Envoyer les valeurs exactement telles qu'elles sont saisies, sans transformation
  if (payload.territories !== undefined && payload.territories.length > 0) {
    // Format 1: territories répété (format standard multipart/form-data)
    payload.territories.forEach(territory => {
      // S'assurer que le territoire est bien une string en minuscules (slug)
      const territoryValue = String(territory).toLowerCase();
      formData.append('territories', territoryValue);
      
      if (import.meta.env.DEV) {
        console.log(`✅ Territoire ajouté au FormData (update): ${territoryValue} (original: ${territory})`);
      }
    });
    
    // Format 2: territories[] (certains backends l'attendent avec crochets)
    // Décommenter si nécessaire
    // payload.territories.forEach(territory => formData.append('territories[]', territory));
    
    if (import.meta.env.DEV) {
      console.log('📤 Territoires envoyés (update):', {
        original: payload.territories,
        normalized: payload.territories.map(t => String(t).toLowerCase()),
        count: payload.territories.length,
      });
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Aucun territoire dans le payload pour updatePartner:', {
        hasTerritories: 'territories' in payload,
        territories: payload.territories,
        territoriesLength: payload.territories?.length || 0,
      });
    }
  }

  // Champs optionnels texte
  if (payload.siret !== undefined) formData.append('siret', payload.siret);
  if (payload.phone !== undefined) formData.append('phone', payload.phone);
  if (payload.address !== undefined) formData.append('address', payload.address);
  if (payload.websiteUrl !== undefined) formData.append('websiteUrl', payload.websiteUrl);
  if (payload.instagramUrl !== undefined) formData.append('instagramUrl', payload.instagramUrl);
  if (payload.facebookUrl !== undefined) formData.append('facebookUrl', payload.facebookUrl);
  if (payload.giftCardDescription !== undefined) formData.append('giftCardDescription', payload.giftCardDescription);
  if (payload.territoryDetails && typeof payload.territoryDetails === 'object' && Object.keys(payload.territoryDetails).length > 0) {
    formData.append('territoryDetails', JSON.stringify(payload.territoryDetails));
  }

  // Fichiers
  // IMPORTANT: Envoyer le logo seulement si c'est un nouveau fichier (File)
  // Ne pas envoyer logoUrl - le backend le génère automatiquement
  if (payload.logo instanceof File) {
    formData.append('logo', payload.logo);
    if (import.meta.env.DEV) {
      console.log('✅ Fichier logo ajouté au FormData:', { 
        name: payload.logo.name, 
        size: payload.logo.size,
        type: payload.logo.type,
        lastModified: new Date(payload.logo.lastModified).toISOString(),
      });
    }
  } else {
    if (import.meta.env.DEV) {
      if (payload.logo !== undefined) {
        console.warn('⚠️ payload.logo présent mais n\'est pas un File:', {
          type: typeof payload.logo,
          value: payload.logo,
          isNull: payload.logo === null,
          isUndefined: payload.logo === undefined,
        });
      } else {
        console.log('ℹ️ Aucun logo à envoyer (payload.logo est undefined)');
      }
    }
  }
  
  if (payload.kbis instanceof File) formData.append('kbis', payload.kbis);
  if (payload.giftCardImage instanceof File) formData.append('giftCardImage', payload.giftCardImage);
  if (payload.giftCardVirtualCardImage instanceof File) {
    formData.append('giftCardVirtualCardImage', payload.giftCardVirtualCardImage);
  }

  // Fichiers multiples
  if (payload.menuImages !== undefined && payload.menuImages.length > 0) {
    payload.menuImages.forEach((file) => {
      formData.append('menuImages', file);
    });
  }
  if (payload.photos !== undefined && payload.photos.length > 0) {
    payload.photos.forEach((file) => {
      formData.append('photos', file);
    });
  }

  // Champs numériques
  if (payload.discoveryCashbackRate !== undefined && payload.discoveryCashbackRate !== null) {
    formData.append('discoveryCashbackRate', payload.discoveryCashbackRate.toString());
  }
  if (payload.permanentCashbackRate !== undefined && payload.permanentCashbackRate !== null) {
    formData.append('permanentCashbackRate', payload.permanentCashbackRate.toString());
  }
  if (payload.welcomeAffiliationAmount !== undefined && payload.welcomeAffiliationAmount !== null) {
    formData.append('welcomeAffiliationAmount', payload.welcomeAffiliationAmount.toString());
  }
  if (payload.permanentAffiliationAmount !== undefined && payload.permanentAffiliationAmount !== null) {
    formData.append('permanentAffiliationAmount', payload.permanentAffiliationAmount.toString());
  }
  if (payload.welcomeUserRate !== undefined && payload.welcomeUserRate !== null) {
    formData.append('welcomeUserRate', payload.welcomeUserRate.toString());
  }
  if (payload.welcomeKashUPRate !== undefined && payload.welcomeKashUPRate !== null) {
    formData.append('welcomeKashUPRate', payload.welcomeKashUPRate.toString());
  }
  if (payload.permanentUserRate !== undefined && payload.permanentUserRate !== null) {
    formData.append('permanentUserRate', payload.permanentUserRate.toString());
  }
  if (payload.permanentKashUPRate !== undefined && payload.permanentKashUPRate !== null) {
    formData.append('permanentKashUPRate', payload.permanentKashUPRate.toString());
  }
  if (payload.giftCardCashbackRate !== undefined && payload.giftCardCashbackRate !== null) {
    formData.append('giftCardCashbackRate', payload.giftCardCashbackRate.toString());
  }
  if (payload.boostRate !== undefined && payload.boostRate !== null) {
    formData.append('boostRate', payload.boostRate.toString());
  }
  if (payload.pointsPerTransaction !== undefined && payload.pointsPerTransaction !== null) {
    formData.append('pointsPerTransaction', payload.pointsPerTransaction.toString());
  }

  // Champs booléens
  if (payload.giftCardEnabled !== undefined) {
    formData.append('giftCardEnabled', payload.giftCardEnabled ? 'true' : 'false');
  }
  if (payload.boostEnabled !== undefined) {
    formData.append('boostEnabled', payload.boostEnabled ? 'true' : 'false');
  }

  // Arrays : marketingPrograms comme JSON string
  if (payload.marketingPrograms !== undefined && payload.marketingPrograms.length > 0) {
    formData.append('marketingPrograms', JSON.stringify(payload.marketingPrograms));
  }
  if (payload.openingDays !== undefined && payload.openingDays.length > 0) {
    payload.openingDays.forEach((day) => {
      formData.append('openingDays[]', day);
    });
  }

  // Horaires d'ouverture
  if (payload.openingHoursStart !== undefined) formData.append('openingHoursStart', payload.openingHoursStart);
  if (payload.openingHoursEnd !== undefined) formData.append('openingHoursEnd', payload.openingHoursEnd);

  return formData;
};

/**
 * Met à jour un partenaire existant
 * 
 * ENDPOINT: PATCH /partners/:id
 * 
 * FORMAT: multipart/form-data (Content-Type géré automatiquement par le navigateur)
 * 
 * FORMAT DE RÉPONSE: StandardResponse<PartnerDTO>
 * 
 * NOTE: Tous les champs sont optionnels (seuls les champs modifiés sont envoyés)
 */
export const updatePartner = async (partnerId: string, payload: Partial<PartnerFormInput>) => {
  // IMPORTANT: Filtrer logoUrl du payload - ne jamais l'envoyer au backend
  // Le backend génère logoUrl automatiquement à partir du fichier logo uploadé
  const cleanPayload = { ...payload };
  
  // Log CRITIQUE pour les territoires AVANT traitement
  if (import.meta.env.DEV) {
    console.log('🌍 TERRITOIRES DANS PAYLOAD (updatePartner - AVANT):', {
      hasTerritories: 'territories' in payload,
      territories: payload.territories,
      territoriesType: typeof payload.territories,
      isArray: Array.isArray(payload.territories),
      length: payload.territories?.length || 0,
      territoriesValues: payload.territories?.map(t => ({
        value: t,
        type: typeof t,
        lower: String(t).toLowerCase(),
      })),
      allPayloadKeys: Object.keys(payload),
      fullPayload: payload,
    });
  }
  
  // Log AVANT suppression pour voir si logo est présent
  if (import.meta.env.DEV) {
    console.log('📋 Payload reçu pour updatePartner:', {
      hasLogo: 'logo' in payload,
      logoType: payload.logo ? typeof payload.logo : 'undefined',
      logoIsFile: payload.logo instanceof File,
      logoName: payload.logo instanceof File ? payload.logo.name : 'N/A',
      logoSize: payload.logo instanceof File ? payload.logo.size : 'N/A',
      hasLogoUrl: !!(payload as any).logoUrl,
      logoUrl: (payload as any).logoUrl,
      allKeys: Object.keys(payload),
    });
  }
  
  delete (cleanPayload as any).logoUrl;
  delete (cleanPayload as any).logoPath;
  delete (cleanPayload as any).imageUrl;
  
  if (import.meta.env.DEV && ((payload as any).logoUrl || (payload as any).logoPath)) {
    console.warn('⚠️ logoUrl/logoPath supprimé du payload avant envoi (ne doit pas être envoyé)');
  }
  
  const formData = serializePartnerUpdateToFormData(cleanPayload);

  if (import.meta.env.DEV) {
    // Log les données envoyées (sans les fichiers pour éviter le spam)
    const formDataEntries: Record<string, string> = {};
    const formDataArray: Array<{ key: string; value: string }> = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        formDataEntries[key] = `[File: ${value.name}, ${value.size} bytes]`;
        formDataArray.push({ key, value: `[File: ${value.name}, ${value.size} bytes]` });
      } else {
        formDataEntries[key] = String(value);
        formDataArray.push({ key, value: String(value) });
      }
    }
    console.log('📤 Données envoyées au backend (updatePartner):', formDataEntries);
    console.log('📋 Format FormData (ordre):', formDataArray);
    console.log('🔍 Vérification données FormData:', {
      categories: {
        hasCategories: formDataArray.some(e => e.key === 'categories'),
        categoriesCount: formDataArray.filter(e => e.key === 'categories').length,
        categoriesValues: formDataArray.filter(e => e.key === 'categories').map(e => e.value),
        hasCategoriesArray: formDataArray.some(e => e.key === 'categories[]'),
        categoriesArrayCount: formDataArray.filter(e => e.key === 'categories[]').length,
        hasCategory: formDataArray.some(e => e.key === 'category'),
        categoryValue: formDataArray.find(e => e.key === 'category')?.value,
      },
      territories: {
        hasTerritories: formDataArray.some(e => e.key === 'territories'),
        territoriesCount: formDataArray.filter(e => e.key === 'territories').length,
        territoriesValues: formDataArray.filter(e => e.key === 'territories').map(e => e.value),
        hasTerritoriesArray: formDataArray.some(e => e.key === 'territories[]'),
        territoriesArrayCount: formDataArray.filter(e => e.key === 'territories[]').length,
      },
      logo: {
        hasLogo: formDataArray.some(e => e.key === 'logo'),
        logoEntry: formDataArray.find(e => e.key === 'logo'),
        isFile: formDataArray.find(e => e.key === 'logo')?.value?.includes('[File:'),
      },
      allKeys: [...new Set(formDataArray.map(e => e.key))],
    });
  }

  // Utiliser le helper updateResource qui gère automatiquement le fallback admin/public
  const response = await updateResource<Partner>('partners', partnerId, formData);
  
  // Vérifier si la réponse indique une erreur
  if (!response.success) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la mise à jour du partenaire:', {
        statusCode: response.statusCode,
        message: response.message,
        meta: response.meta,
        fieldErrors: response.meta?.details?.fieldErrors,
      });
    }
    // Lancer une erreur pour que React Query la gère
    throw new Error(response.message || `Erreur ${response.statusCode} lors de la mise à jour du partenaire`);
  }
  
  const updatedPartner = unwrapStandardResponse(response);
  
  // Normaliser le logoUrl si présent
  if (updatedPartner.logoUrl) {
    const normalized = normalizeImageUrl(updatedPartner.logoUrl);
    if (normalized) {
      updatedPartner.logoUrl = normalized;
    }
  }
  
  if (import.meta.env.DEV) {
    console.log('✅ Partenaire mis à jour avec succès:', {
      id: updatedPartner.id,
      name: updatedPartner.name,
      hasLogoUrl: !!updatedPartner.logoUrl,
      logoUrl: updatedPartner.logoUrl,
      territories: updatedPartner.territories,
      territory: updatedPartner.territory,
      categories: updatedPartner.categories,
    });
  }
  
  return updatedPartner;
};

export const createOffer = async (payload: OfferFormInput) => {
  const response = await postJson<Offer>('offers', payload);
  return unwrapResponse(response);
};

export const updateOffer = async (offerId: string, payload: Partial<OfferFormInput>) => {
  const response = await patchJson<Offer>(`offers/${offerId}`, payload);
  return unwrapResponse(response);
};

export type PartnerStatistics = {
  totalTransactions: number;
  totalAmount: number;
  featuredOffersSold: number;
  activeUsers: number;
  transactionGrowth: number; // Pourcentage de croissance des transactions
  averageBasketGrowth: number; // Pourcentage de croissance du panier moyen
  ageDistribution: Array<{ name: string; value: number }>;
  genderDistribution: Array<{ name: string; value: number }>;
  dayDistribution: Array<{ day: string; transactions: number }>;
  hourDistribution: Array<{ hour: string; transactions: number }>;
  dailyEvolution: Array<{ date: string; transactions: number; amount: number }>;
  transactionEvolution: Array<{ date: string; transactions: number; growth: number }>; // Évolution des transactions avec croissance
  averageBasketEvolution: Array<{ date: string; averageBasket: number; growth: number }>; // Évolution du panier moyen avec croissance
};

export const fetchPartnerStatistics = async (partnerId: string) => {
  const response = await getJson<PartnerStatistics>(`partners/${partnerId}/statistics`);
  return unwrapResponse(response);
};

export type PartnerDocument = {
  id: string;
  partnerId: string;
  name: string;
  type: 'invoice' | 'commercial_analysis' | 'contract' | 'other';
  url: string;
  size?: string;
  createdAt: string;
};

export const fetchPartnerDocuments = async (partnerId: string) => {
  const response = await getStandardJson<PartnerDocument[]>(`partners/${partnerId}/documents`);
  return unwrapStandardResponse(response);
};

export const uploadPartnerDocument = async (partnerId: string, file: File, name: string, type: PartnerDocument['type']) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('type', type);
  const response = await postStandardJson<PartnerDocument>(`partners/${partnerId}/documents`, formData);
  return unwrapStandardResponse(response);
};

export const deletePartnerDocument = async (partnerId: string, documentId: string) => {
  const response = await deleteStandardJson(`partners/${partnerId}/documents/${documentId}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};



