import type { Partner as ApiPartner } from '@/src/services/partnerService';
import type { MarketingProgram } from '@/constants/marketingPrograms';

export type PartnerOffer = {
  label: string;
  rate: number;
};

export type PartnerViewModel = {
  id: string;
  name: string;
  categoryId: string;
  /** Nom de la catégorie (pour résolution image hero quand categoryId est un CUID) */
  categoryName?: string;
  city: string;
  /** Affichage : un seul département ou liste "Martinique, Guadeloupe, Guyane" */
  country: string;
  /** Liste des départements (pour filtrage et affichage) */
  territories?: string[];
  address?: string;
  cashbackRate: number;
  isBoosted: boolean;
  isPopular: boolean;
  isNew: boolean;
  isRecommended: boolean;
  marketingPrograms?: MarketingProgram[];
  pointsPerTransaction?: number;
  latitude?: number;
  longitude?: number;
  logoUrl: string;
  phone?: string;
  openingHours?: string;
  openingDays?: string[];
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  permanentOffer: PartnerOffer;
  welcomeOffer: PartnerOffer;
  /** Image de couverture pour la fiche (photo perso ou première photo) */
  heroImageUrl?: string;
  /** Adresses et réseaux par département (pour sélecteur sur la fiche partenaire) */
  territoryDetails?: Record<string, { address?: string; websiteUrl?: string; facebookUrl?: string; instagramUrl?: string }> | null;
};

const buildAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=422F8E&color=FFFFFF&bold=true`;

const toNum = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

/** Normalise territories (API peut renvoyer array, JSON string, ou array avec 1 élément JSON string) */
function normalizeTerritoriesList(partner: ApiPartner): string[] {
  const raw = partner.territories;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'string' && first.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(first);
        return Array.isArray(parsed) ? parsed : [partner.territory ?? 'Martinique'];
      } catch {
        return raw as string[];
      }
    }
    return raw as string[];
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [partner.territory ?? 'Martinique'];
    } catch {
      return partner.territory ? [partner.territory] : ['Martinique'];
    }
  }
  if (partner.territory) return [partner.territory];
  return ['Martinique'];
}

export const adaptPartnerFromApi = (partner: ApiPartner): PartnerViewModel => {
  const baseRate = toNum(partner.tauxCashbackBase) ?? 0;
  const permanentRate = toNum(partner.permanentCashbackRate) ?? baseRate;
  const welcomeRate = toNum(partner.discoveryCashbackRate) ?? baseRate;
  const marketingPrograms = partner.marketingPrograms ?? [];

  // Mapper les programmes marketing vers les booléens existants pour la compatibilité
  const isBoosted = Boolean(partner.boostable) || marketingPrograms.includes('boosted');
  const isRecommended = marketingPrograms.includes('pepites');
  const isPopular = marketingPrograms.includes('most-searched');

  return {
    id: partner.id,
    name: partner.name,
    categoryId: partner.categoryId ?? partner.category?.id ?? '',
    categoryName: partner.category?.name ?? undefined,
    city: partner.shortDescription ?? partner.category?.name ?? 'À découvrir',
    country: (() => {
      const list = normalizeTerritoriesList(partner);
      return list.join(', ');
    })(),
    territories: (() => {
      const list = normalizeTerritoriesList(partner);
      return list.length > 0 ? list : undefined;
    })(),
    address: partner.address ?? undefined,
    cashbackRate: permanentRate,
    isBoosted,
    isPopular,
    isNew: false,
    isRecommended,
    marketingPrograms,
    pointsPerTransaction: typeof partner.pointsPerTransaction === 'number' ? partner.pointsPerTransaction : undefined,
    latitude: typeof partner.latitude === 'number' ? partner.latitude : undefined,
    longitude: typeof partner.longitude === 'number' ? partner.longitude : undefined,
    logoUrl: partner.logoUrl ?? buildAvatarUrl(partner.name),
    phone: partner.phone ?? undefined,
    openingHours: partner.openingHours ?? undefined,
    openingDays: (() => {
      const raw = partner.openingDays;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw);
          return Array.isArray(p) ? p : undefined;
        } catch {
          return undefined;
        }
      }
      return undefined;
    })(),
    websiteUrl: partner.websiteUrl ?? undefined,
    facebookUrl: partner.facebookUrl ?? undefined,
    instagramUrl: partner.instagramUrl ?? undefined,
    permanentOffer: { label: 'Offre permanente', rate: permanentRate },
    welcomeOffer: { label: 'Offre de bienvenue', rate: welcomeRate },
    heroImageUrl:
      Array.isArray(partner.photos) && partner.photos.length > 0
        ? partner.photos[0]
        : undefined,
    territoryDetails: partner.territoryDetails && typeof partner.territoryDetails === 'object' ? partner.territoryDetails : undefined,
  };
};


