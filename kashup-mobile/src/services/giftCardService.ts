import apiClient from './apiClient';

/**
 * Endpoints utilisés :
 * - GET /gift-cards : catalogue public des cartes/bons disponibles
 * - GET /me/gift-cards : achats effectués par l’utilisateur courant
 * - POST /gift-cards/purchase : achat d’un bon/carte (auth requis)
 */

export type GiftCard = {
  id: string;
  type: 'bon_achat' | 'carte_cadeau' | 'box_up' | string;
  name: string;
  description: string;
  value: number;
  isGiftable: boolean;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
};

export type GiftCardPurchasePartner = {
  id: string;
  name: string;
  logoUrl?: string | null;
  territories?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  websiteUrl?: string | null;
};

export type GiftCardPurchase = {
  id: string;
  giftCardId: string;
  purchaserId: string;
  beneficiaryEmail: string;
  message?: string | null;
  amount: number;
  code: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  giftCard: {
    id: string;
    name: string;
    type: string;
    value: number;
    partnerId?: string | null;
    partner?: GiftCardPurchasePartner | null;
  };
};

export type GiftCardOffer = {
  id: string;
  title: string;
  description: string;
  partner: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  price: number;
  accentColor?: string | null;
  imageUrl?: string | null;
};

export type GiftBoxPartner = {
  id: string;
  name: string;
  accentColor?: string | null;
  category?: string | null;
  logoUrl?: string | null;
  /** Aligné back office */
  partenaireId?: string;
  partenaireName?: string;
  offrePartenaire?: string;
  conditions?: string;
};

/** Format BoxUp aligné back office (nom, partenaires avec offrePartenaire, conditions) */
export type BoxUpPartner = {
  partenaireId: string;
  partenaireName?: string;
  logoUrl?: string | null;
  offrePartenaire: string;
  conditions?: string;
};

export type GiftBox = {
  id: string;
  /** Aligné back office */
  nom?: string;
  title: string;
  shortDescription: string;
  description: string;
  priceFrom: number;
  value?: number;
  heroImageUrl?: string | null;
  imageUrl?: string | null;
  cashbackInfo?: string | null;
  commentCaMarche?: string | null;
  status?: 'active' | 'inactive';
  partners: GiftBoxPartner[];
  /** Aligné back office */
  partenaires?: BoxUpPartner[];
};

/** Config Carte Sélection UP (aligné back office) */
export type CarteUpLibre = {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
  montantsDisponibles: number[];
  partenairesEligibles: string[];
  conditions?: string;
  commentCaMarche?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

export type PurchaseGiftCardPayload = {
  giftCardId: string;
  beneficiaryEmail: string;
  message?: string;
  amount?: number;
};

export const getGiftCards = async (): Promise<GiftCard[]> => {
  const { data } = await apiClient.get<GiftCard[]>('/gift-cards');
  return Array.isArray(data) ? data : [];
};

export const getUserGiftCards = async (): Promise<GiftCardPurchase[]> => {
  const { data } = await apiClient.get<GiftCardPurchase[]>('/me/gift-cards');
  return Array.isArray(data) ? data : [];
};

export const purchaseGiftCard = async (payload: PurchaseGiftCardPayload): Promise<GiftCardPurchase> => {
  const { data } = await apiClient.post<GiftCardPurchase>('/gift-cards/purchase', payload);
  return data;
};

export const getGiftCardOffers = async (): Promise<GiftCardOffer[]> => {
  const { data } = await apiClient.get<GiftCardOffer[]>('/gift-cards/offers');
  return Array.isArray(data) ? data : [];
};

export const getGiftBoxes = async (): Promise<GiftBox[]> => {
  const { data } = await apiClient.get<GiftBox[]>('/gift-cards/boxes');
  return Array.isArray(data) ? data : [];
};

export const getGiftBoxById = async (boxId: string): Promise<GiftBox> => {
  const { data } = await apiClient.get<GiftBox & { box?: GiftBox }>(`/gift-cards/boxes/${boxId}`);
  const raw = (data as { box?: GiftBox })?.box ?? data;
  const box = raw as GiftBox;
  return {
    ...box,
    partners: Array.isArray(box.partners) ? box.partners : [],
    partenaires: Array.isArray(box.partenaires) ? box.partenaires : box.partenaires ?? [],
  };
};

/** Configs Carte Sélection UP actives pour l'app (même format que back office) */
export const getCartesUpLibresForApp = async (): Promise<CarteUpLibre[]> => {
  const { data } = await apiClient.get<CarteUpLibre[]>('/gift-cards/cartes-up-libres/for-app');
  return Array.isArray(data) ? data : [];
};


