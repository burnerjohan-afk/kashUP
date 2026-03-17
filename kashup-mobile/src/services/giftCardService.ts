import apiClient from './apiClient';
import { apiClient as apiClientAuth, getAuthToken, refreshToken } from './api';
import { ApiError, unwrapStandardResponse } from '../types/api';

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
  // Vidéo personnalisée (optionnelle)
  videoUrl?: string | null;
  videoDurationSeconds?: number | null;
  videoStatus?: string | null;
  videoSentAt?: string | null;
  videoOpenedAt?: string | null;
  videoViewedAt?: string | null;
  videoViewCount?: number;
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
  /** Offre partenaire (ex. "Massage 1h") – Carte UP */
  offre?: string | null;
  partner: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  price: number;
  /** Taux de cashback (%) à l'achat – affiché dans l'app */
  cashbackRate?: number | null;
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
  /** Taux de cashback (%) à l'achat – affiché dans l'app */
  cashbackRate?: number | null;
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
  /** Taux de cashback (%) à l'achat – affiché dans l'app */
  cashbackRate?: number | null;
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

/** Envoi d'une offre prédefinie à un utilisateur (notification in-app). L'e-mail doit être celui d'un compte KashUP. */
export type SendPredefinedGiftPayload = {
  offerId: string;
  beneficiaryEmail: string;
  message?: string;
};

/** Vérifie qu'un token est disponible (tente un refresh si besoin). Même chemin que auth. */
async function ensureAuthToken(): Promise<void> {
  let token = await getAuthToken();
  if (!token?.trim()) {
    try {
      await refreshToken();
      token = await getAuthToken();
    } catch {
      // refresh a échoué, on laisse l'appel partir ; le backend renverra 401
    }
  }
  if (!token?.trim()) {
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
  }
}

export const sendPredefinedGift = async (
  payload: SendPredefinedGiftPayload
): Promise<{ success: boolean; message: string; purchaseId?: string }> => {
  await ensureAuthToken();
  const response = await apiClientAuth<{ success: boolean; message: string; purchaseId?: string }>(
    'POST',
    '/gift-cards/send-predefined',
    payload
  );
  return unwrapStandardResponse(response) as { success: boolean; message: string; purchaseId?: string };
};

/** Envoi d'une Box UP à un utilisateur (notification in-app). */
export type SendBoxUpPayload = {
  boxId: string;
  beneficiaryEmail: string;
  message?: string;
};

export const sendBoxUp = async (
  payload: SendBoxUpPayload
): Promise<{ success: boolean; message: string; purchaseId?: string }> => {
  await ensureAuthToken();
  const response = await apiClientAuth<{ success: boolean; message: string; purchaseId?: string }>(
    'POST',
    '/gift-cards/send-box',
    payload
  );
  return unwrapStandardResponse(response) as { success: boolean; message: string; purchaseId?: string };
};

/** Carte Sélection UP : montant libre (pas de catalogue). Envoi par email (PDF) ou notification app. */
export type SendSelectionUpPayload = {
  amount: number;
  beneficiaryEmail: string;
  message?: string;
  partnerId?: string;
  partnerName?: string;
};

export const sendSelectionUp = async (
  payload: SendSelectionUpPayload
): Promise<{ success: boolean; message: string; purchaseId?: string }> => {
  await ensureAuthToken();
  const response = await apiClientAuth<{ success: boolean; message: string; purchaseId?: string }>(
    'POST',
    '/gift-cards/send-selection',
    payload
  );
  return unwrapStandardResponse(response) as { success: boolean; message: string; purchaseId?: string };
};

// ——— Paiement par carte (Apple Pay / Google Pay via Stripe) ———

export type CreatePaymentIntentForGiftPayload =
  | { giftType: 'carte_up'; offerId: string; beneficiaryEmail: string; message?: string }
  | {
      giftType: 'selection_up';
      amount: number;
      beneficiaryEmail: string;
      message?: string;
      partnerId?: string;
      partnerName?: string;
    }
  | { giftType: 'box_up'; boxId: string; beneficiaryEmail: string; message?: string };

export type ConfirmCardPaymentForGiftPayload =
  | { paymentIntentId: string; giftType: 'carte_up'; offerId: string; beneficiaryEmail: string; message?: string }
  | {
      paymentIntentId: string;
      giftType: 'selection_up';
      amount: number;
      beneficiaryEmail: string;
      message?: string;
      partnerId?: string;
      partnerName?: string;
    }
  | { paymentIntentId: string; giftType: 'box_up'; boxId: string; beneficiaryEmail: string; message?: string };

export async function createGiftCardPaymentIntent(
  payload: CreatePaymentIntentForGiftPayload
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  await ensureAuthToken();
  const response = await apiClientAuth<{ clientSecret: string; paymentIntentId: string }>(
    'POST',
    '/gift-cards/create-payment-intent',
    payload
  );
  return unwrapStandardResponse(response) as { clientSecret: string; paymentIntentId: string };
}

export async function confirmCardPaymentForGift(
  payload: ConfirmCardPaymentForGiftPayload
): Promise<{ success: boolean; message: string; purchaseId?: string }> {
  await ensureAuthToken();
  const response = await apiClientAuth<{ success: boolean; message: string; purchaseId?: string }>(
    'POST',
    '/gift-cards/confirm-card-payment',
    payload
  );
  return unwrapStandardResponse(response) as { success: boolean; message: string; purchaseId?: string };
}

export type UploadGiftVideoPayload = {
  purchaseId: string;
  videoUri: string;
  requestedVideoDuration: number;
  videoDurationOption?: 'default' | 'extended';
  consentAccepted: boolean;
};

export const uploadGiftVideo = async (payload: UploadGiftVideoPayload): Promise<void> => {
  await ensureAuthToken();

  const formData = new FormData();
  formData.append('requestedVideoDuration', String(payload.requestedVideoDuration));
  formData.append('videoDurationOption', payload.videoDurationOption ?? 'default');
  formData.append('videoConsentAccepted', payload.consentAccepted ? 'true' : 'false');
  formData.append(
    'video',
    {
      uri: payload.videoUri,
      name: 'gift-video.mp4',
      type: 'video/mp4',
    } as any
  );

  await apiClientAuth(
    'POST',
    `/gift-cards/orders/${payload.purchaseId}/video`,
    formData as any
  ).then(unwrapStandardResponse);
};

export const markGiftVideoViewed = async (purchaseId: string): Promise<void> => {
  await ensureAuthToken();
  await apiClientAuth('POST', `/gift-cards/orders/${purchaseId}/video/viewed`, {}).then(unwrapStandardResponse);
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


