/**
 * Services API pour les partenaires
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Partner, PartnerFilters, CreatePartnerInput, UpdatePartnerInput } from '@/types/api/partner.dto';
import type { ListParams } from '@/types/api';

/**
 * Récupérer la liste des partenaires
 */
export const fetchPartners = async (
  filters: PartnerFilters = {},
  params: ListParams = {}
): Promise<ApiResponse<Partner[]>> => {
  const queryParams: Record<string, string> = {
    ...filters,
    ...(params.page && { page: String(params.page) }),
    ...(params.pageSize && { pageSize: String(params.pageSize) }),
    ...(params.sort && { sort: params.sort }),
    ...(params.updatedSince && { updatedSince: params.updatedSince }),
  };

  return apiClient.get<Partner[]>('/partners', queryParams);
};

/**
 * Récupérer un partenaire par ID
 */
export const fetchPartner = async (id: string): Promise<ApiResponse<Partner>> => {
  return apiClient.get<Partner>(`/partners/${id}`);
};

/**
 * Créer un partenaire
 */
export const createPartner = async (
  data: CreatePartnerInput
): Promise<ApiResponse<Partner>> => {
  return apiClient.post<Partner>('/partners', data);
};

/**
 * Mettre à jour un partenaire
 */
export const updatePartner = async (
  id: string,
  data: UpdatePartnerInput
): Promise<ApiResponse<Partner>> => {
  return apiClient.patch<Partner>(`/partners/${id}`, data);
};

/**
 * Supprimer un partenaire
 */
export const deletePartner = async (id: string): Promise<ApiResponse<void>> => {
  return apiClient.delete<void>(`/partners/${id}`);
};

