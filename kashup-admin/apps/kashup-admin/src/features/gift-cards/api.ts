import { z } from 'zod';
import { downloadFile, getJson, postFormData, postJson, patchFormData } from '@/lib/api/client';
import { unwrapResponse } from '@/lib/api/response';
import type { GiftCard } from '@/types/entities';

export type GiftCardOrder = GiftCard & {
  orderId: string;
  code: string;
  createdAt: string;
};

export const giftCardPurchaseSchema = z.object({
  partnerId: z.string().min(1),
  value: z.number().positive(),
  quantity: z.number().int().positive(),
  beneficiaryEmail: z.string().email(),
});

export type GiftCardPurchaseInput = z.infer<typeof giftCardPurchaseSchema>;

// Schéma pour la configuration des cartes cadeaux
export const giftCardConfigSchema = z.object({
  giftCardDescription: z.string().optional(),
  giftCardImage: z.instanceof(File).optional(),
  giftCardVirtualCardImage: z.instanceof(File).optional(),
  giftCardHowItWorks: z.string().optional(),
  giftCardConditions: z.string().optional(),
});

export type GiftCardConfigInput = z.infer<typeof giftCardConfigSchema>;

export type GiftCardConfig = {
  giftCardDescription?: string;
  giftCardImageUrl?: string;
  giftCardVirtualCardImageUrl?: string;
  giftCardHowItWorks?: string;
  giftCardConditions?: string;
};

// Schéma pour la configuration des Box UP
export const boxUpConfigSchema = z.object({
  boxUpName: z.string().min(1),
  boxUpPartners: z.array(z.string()).min(1),
  boxUpImage: z.instanceof(File).optional(),
  boxUpHowItWorks: z.string().optional(),
  boxUpConditions: z.string().optional(),
});

export type BoxUpConfigInput = z.infer<typeof boxUpConfigSchema>;

export type BoxUpConfig = {
  id?: string;
  boxUpName: string;
  boxUpPartners: string[];
  boxUpImageUrl?: string;
  boxUpHowItWorks?: string;
  boxUpConditions?: string;
};

export const fetchGiftCardsCatalogue = async () => {
  const response = await getJson<GiftCard[]>('gift-cards');
  return unwrapResponse(response);
};

export const fetchGiftCardOrders = async () => {
  const response = await getJson<GiftCardOrder[]>('gift-cards/orders');
  return unwrapResponse(response);
};

export const purchaseGiftCard = async (payload: GiftCardPurchaseInput) => {
  const response = await postJson<GiftCardOrder>('gift-cards/purchase', payload);
  return unwrapResponse(response);
};

export const exportGiftCards = async () => {
  const blob = await downloadFile('gift-cards/export');
  return blob;
};

// Fonctions pour la configuration des cartes cadeaux
export const fetchGiftCardConfig = async () => {
  const response = await getJson<GiftCardConfig>('gift-cards/config');
  return unwrapResponse(response);
};

export const updateGiftCardConfig = async (payload: GiftCardConfigInput) => {
  const formData = new FormData();
  if (payload.giftCardDescription) formData.append('giftCardDescription', payload.giftCardDescription);
  if (payload.giftCardImage) formData.append('giftCardImage', payload.giftCardImage);
  if (payload.giftCardVirtualCardImage) formData.append('giftCardVirtualCardImage', payload.giftCardVirtualCardImage);
  if (payload.giftCardHowItWorks) formData.append('giftCardHowItWorks', payload.giftCardHowItWorks);
  if (payload.giftCardConditions) formData.append('giftCardConditions', payload.giftCardConditions);

  const response = await patchFormData<GiftCardConfig>('gift-cards/config', formData);
  return unwrapResponse(response);
};

// Fonctions pour la configuration des Box UP
export const fetchBoxUpConfig = async () => {
  const response = await getJson<BoxUpConfig>('gift-cards/box-up/config');
  return unwrapResponse(response);
};

export const createOrUpdateBoxUpConfig = async (payload: BoxUpConfigInput) => {
  const formData = new FormData();
  formData.append('boxUpName', payload.boxUpName);
  formData.append('boxUpPartners', JSON.stringify(payload.boxUpPartners));
  if (payload.boxUpImage) formData.append('boxUpImage', payload.boxUpImage);
  if (payload.boxUpHowItWorks) formData.append('boxUpHowItWorks', payload.boxUpHowItWorks);
  if (payload.boxUpConditions) formData.append('boxUpConditions', payload.boxUpConditions);

  const response = await postFormData<BoxUpConfig>('gift-cards/box-up/config', formData);
  return unwrapResponse(response);
};

