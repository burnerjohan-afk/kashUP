import { getStandardJson, postStandardJson, patchStandardJson, deleteStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { BoxUp, BoxUpInput } from '@/types/gifts';

// ============================================================================
// API - BOX UP
// ============================================================================

export const fetchBoxUps = async (): Promise<BoxUp[]> => {
  const response = await getStandardJson<BoxUp[]>('gift-cards/box-ups');
  return unwrapStandardResponse(response);
};

export const fetchBoxUpById = async (id: string): Promise<BoxUp> => {
  const response = await getStandardJson<BoxUp>(`gift-cards/box-ups/${id}`);
  return unwrapStandardResponse(response);
};

export const createBoxUp = async (payload: BoxUpInput): Promise<BoxUp> => {
  const formData = new FormData();
  formData.append('nom', payload.nom);
  formData.append('description', payload.description);
  if (payload.image) {
    const name = payload.image.name && /\.(jpe?g|png|gif|webp)$/i.test(payload.image.name)
      ? payload.image.name
      : 'image.jpg';
    formData.append('image', payload.image, name);
  }
  formData.append('partenaires', JSON.stringify(payload.partenaires));
  if (payload.commentCaMarche) {
    formData.append('commentCaMarche', payload.commentCaMarche);
  }
  if (payload.cashbackRate != null && payload.cashbackRate !== '') {
    formData.append('cashbackRate', String(Number(payload.cashbackRate)));
  }
  formData.append('status', payload.status);

  const response = await postStandardJson<BoxUp>('gift-cards/box-ups', formData);
  return unwrapStandardResponse(response);
};

/** Payload de mise à jour : champs BoxUp + imageUrl pour conserver l’image existante (comme home-banners). */
export type BoxUpUpdatePayload = Partial<BoxUpInput> & { imageUrl?: string };

export const updateBoxUp = async (id: string, payload: BoxUpUpdatePayload): Promise<BoxUp> => {
  const formData = new FormData();
  if (payload.nom) formData.append('nom', payload.nom);
  if (payload.description) formData.append('description', payload.description);
  if (payload.image) {
    const name = payload.image.name && /\.(jpe?g|png|gif|webp)$/i.test(payload.image.name)
      ? payload.image.name
      : 'image.jpg';
    formData.append('image', payload.image, name);
  } else if (payload.imageUrl != null && String(payload.imageUrl).trim() !== '') {
    formData.append('imageUrl', String(payload.imageUrl).trim());
  }
  if (payload.partenaires) {
    formData.append('partenaires', JSON.stringify(payload.partenaires));
  }
  if (payload.commentCaMarche !== undefined) {
    formData.append('commentCaMarche', payload.commentCaMarche || '');
  }
  if (payload.cashbackRate !== undefined) {
    formData.append('cashbackRate', payload.cashbackRate == null || payload.cashbackRate === '' ? '' : String(payload.cashbackRate));
  }
  if (payload.status) {
    formData.append('status', payload.status);
  }

  const response = await patchStandardJson<BoxUp>(`gift-cards/box-ups/${id}`, formData);
  return unwrapStandardResponse(response);
};

export const deleteBoxUp = async (id: string): Promise<void> => {
  const response = await deleteStandardJson(`gift-cards/box-ups/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Erreur lors de la suppression');
  }
};

