import { z } from 'zod';
import { getStandardJson, postFormData, patchFormData, deleteStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type {
  CarteUpLibre,
  CarteUpPredefinie,
  CarteUpLibreInput,
  CarteUpPredefinieInput,
  GiftCardAmount,
} from '@/types/gifts';

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

export const giftCardAmountSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
});

export const carteUpLibreSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire'),
  description: z.string().min(1, 'La description est obligatoire'),
  image: z.instanceof(File).optional(),
  montantsDisponibles: z.array(z.number().positive()).min(0), // vide = montant libre défini par l'utilisateur
  partenairesEligibles: z.array(z.string()).min(1, 'Au moins un partenaire doit être sélectionné'),
  conditions: z.string().optional(),
  commentCaMarche: z.string().optional(),
  cashbackRate: z.number().min(0).max(100).optional().nullable(),
  status: z.enum(['active', 'inactive']),
});

export const carteUpPredefinieSchema = z.object({
  nom: z.string().min(1, 'Le nom est obligatoire'),
  partenaireId: z.string().min(1, 'Le partenaire est obligatoire'),
  offre: z.string().optional(),
  montant: z.number().positive('Le montant doit être positif'),
  image: z.instanceof(File).optional(),
  description: z.string().min(1, 'La description est obligatoire'),
  dureeValiditeJours: z.number().int().min(1).optional(),
  conditions: z.string().optional(),
  commentCaMarche: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

// ============================================================================
// API - MONTANTS DE CARTES CADEAUX
// ============================================================================

export const fetchGiftCardAmounts = async (): Promise<GiftCardAmount[]> => {
  const response = await getStandardJson<GiftCardAmount[]>('gift-cards/amounts');
  return unwrapStandardResponse(response);
};

export const createGiftCardAmount = async (amount: number): Promise<GiftCardAmount> => {
  console.log('[API] createGiftCardAmount appelé avec:', amount);
  const response = await postStandardJson<GiftCardAmount>('gift-cards/amounts', { amount });
  console.log('[API] Réponse reçue:', response);
  const result = unwrapStandardResponse(response);
  console.log('[API] Résultat unwrap:', result);
  return result;
};

export const deleteGiftCardAmount = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`gift-cards/amounts/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};

// ============================================================================
// API - CARTES UP LIBRES
// ============================================================================

export const fetchCartesUpLibres = async (): Promise<CarteUpLibre[]> => {
  const response = await getStandardJson<CarteUpLibre[]>('gift-cards/cartes-up-libres');
  return unwrapStandardResponse(response);
};

export const fetchCarteUpLibreById = async (id: string): Promise<CarteUpLibre> => {
  const response = await getStandardJson<CarteUpLibre>(`gift-cards/cartes-up-libres/${id}`);
  return unwrapStandardResponse(response);
};

export const createCarteUpLibre = async (payload: CarteUpLibreInput): Promise<CarteUpLibre> => {
  const formData = new FormData();
  formData.append('nom', payload.nom);
  formData.append('description', payload.description);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  formData.append('montantsDisponibles', JSON.stringify(payload.montantsDisponibles));
  formData.append('partenairesEligibles', JSON.stringify(payload.partenairesEligibles));
  if (payload.conditions) {
    formData.append('conditions', payload.conditions);
  }
  if (payload.commentCaMarche) {
    formData.append('commentCaMarche', payload.commentCaMarche);
  }
  if (payload.cashbackRate != null && payload.cashbackRate !== '' && !Number.isNaN(Number(payload.cashbackRate))) {
    formData.append('cashbackRate', String(Number(payload.cashbackRate)));
  }
  formData.append('status', payload.status);

  const response = await postStandardJson<CarteUpLibre>('gift-cards/cartes-up-libres', formData);
  return unwrapStandardResponse(response);
};

export const updateCarteUpLibre = async (
  id: string,
  payload: Partial<CarteUpLibreInput>
): Promise<CarteUpLibre> => {
  const formData = new FormData();
  if (payload.nom) formData.append('nom', payload.nom);
  if (payload.description) formData.append('description', payload.description);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  if (payload.montantsDisponibles) {
    formData.append('montantsDisponibles', JSON.stringify(payload.montantsDisponibles));
  }
  if (payload.partenairesEligibles) {
    formData.append('partenairesEligibles', JSON.stringify(payload.partenairesEligibles));
  }
  if (payload.conditions !== undefined) {
    formData.append('conditions', payload.conditions || '');
  }
  if (payload.commentCaMarche !== undefined) {
    formData.append('commentCaMarche', payload.commentCaMarche || '');
  }
  if (payload.cashbackRate !== undefined) {
    const rate = payload.cashbackRate;
    const isClear = rate == null || rate === '' || Number.isNaN(Number(rate));
    formData.append('cashbackRate', isClear ? '' : String(Number(rate)));
  }
  if (payload.status) {
    formData.append('status', payload.status);
  }

  const response = await patchStandardJson<CarteUpLibre>(`gift-cards/cartes-up-libres/${id}`, formData);
  return unwrapStandardResponse(response);
};

export const deleteCarteUpLibre = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`gift-cards/cartes-up-libres/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};

// ============================================================================
// API - CARTES UP PRÉ-DÉFINIES
// ============================================================================

export const fetchCartesUpPredefinies = async (): Promise<CarteUpPredefinie[]> => {
  const response = await getStandardJson<CarteUpPredefinie[]>('gift-cards/cartes-up-predefinies');
  return unwrapStandardResponse(response);
};

export const fetchCarteUpPredefinieById = async (id: string): Promise<CarteUpPredefinie> => {
  const response = await getStandardJson<CarteUpPredefinie>(`gift-cards/cartes-up-predefinies/${id}`);
  return unwrapStandardResponse(response);
};

/**
 * Créer une Carte UP (admin).
 * Même pattern que home-banners : le formulaire envoie un FormData avec champ "image" (fichier)
 * ou "imageUrl" (URL existante en mise à jour).
 */
export const createCarteUpPredefinie = async (formData: FormData): Promise<CarteUpPredefinie> => {
  const response = await postFormData<CarteUpPredefinie>('gift-cards/cartes-up-predefinies', formData);
  return unwrapStandardResponse(response as import('@/types/api').StandardResponse<CarteUpPredefinie>);
};

/**
 * Mettre à jour une Carte UP (admin).
 * FormData avec "image" (nouveau fichier) ou "imageUrl" (conserver l’image existante).
 */
export const updateCarteUpPredefinie = async (
  id: string,
  formData: FormData
): Promise<CarteUpPredefinie> => {
  const response = await patchFormData<CarteUpPredefinie>(
    `gift-cards/cartes-up-predefinies/${id}`,
    formData
  );
  return unwrapStandardResponse(response as import('@/types/api').StandardResponse<CarteUpPredefinie>);
};

export const deleteCarteUpPredefinie = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`gift-cards/cartes-up-predefinies/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};

