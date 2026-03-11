/**
 * Services API pour les offres
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Offer, OfferFilters, CreateOfferInput, UpdateOfferInput } from '@/types/api/offer.dto';
import type { ListParams } from '@/types/api';

/**
 * Récupérer la liste des offres
 */
export const fetchOffers = async (
  filters: OfferFilters = {},
  params: ListParams = {}
): Promise<ApiResponse<Offer[]>> => {
  const queryParams: Record<string, string> = {
    ...filters,
    ...(params.page && { page: String(params.page) }),
    ...(params.pageSize && { pageSize: String(params.pageSize) }),
    ...(params.sort && { sort: params.sort }),
    ...(params.updatedSince && { updatedSince: params.updatedSince }),
  };

  return apiClient.get<Offer[]>('/offers', queryParams);
};

/**
 * Récupérer une offre par ID
 */
export const fetchOffer = async (id: string): Promise<ApiResponse<Offer>> => {
  return apiClient.get<Offer>(`/offers/${id}`);
};

/**
 * Créer une offre
 */
export const createOffer = async (data: CreateOfferInput): Promise<ApiResponse<Offer>> => {
  return apiClient.post<Offer>('/offers', data);
};

/**
 * Mettre à jour une offre
 */
export const updateOffer = async (
  id: string,
  data: UpdateOfferInput
): Promise<ApiResponse<Offer>> => {
  return apiClient.patch<Offer>(`/offers/${id}`, data);
};

/**
 * Supprimer une offre
 */
export const deleteOffer = async (id: string): Promise<ApiResponse<void>> => {
  return apiClient.delete<void>(`/offers/${id}`);
};

