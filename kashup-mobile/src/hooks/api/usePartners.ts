/**
 * Hook React Query pour les partenaires
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api/client';
import { getLastSync, setLastSync } from '../../services/sync/deltaSync';

export interface Partner {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerFilters {
  category?: string;
  search?: string;
  department?: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  updatedSince?: string;
}

export interface PartnersResponse {
  partners: Partner[];
  total: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Récupère les partenaires depuis l'API
 */
async function fetchPartners(
  filters: PartnerFilters = {},
  params: ListParams = {}
): Promise<PartnersResponse> {
  const response = await apiClient.get<PartnersResponse>('/partners', {
    params: {
      ...filters,
      ...params,
    },
  });

  return response.data;
}

/**
 * Hook pour récupérer les partenaires
 */
export function usePartners(filters: PartnerFilters = {}, listParams: ListParams = {}) {
  // Récupérer la date de dernière sync
  const [lastSync, setLastSyncState] = useState<string | null>(null);

  useEffect(() => {
    getLastSync('partners').then(setLastSyncState);
  }, []);

  // Construire les paramètres avec updatedSince si disponible
  const queryParams = {
    ...listParams,
    ...(lastSync && !listParams.updatedSince ? { updatedSince: lastSync } : {}),
  };

  const query = useQuery({
    queryKey: ['partners', filters, queryParams],
    queryFn: () => fetchPartners(filters, queryParams),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Mettre à jour la date de dernière sync en cas de succès
  useEffect(() => {
    if (query.isSuccess) {
      setLastSync('partners', new Date().toISOString());
    }
  }, [query.isSuccess]);

  return {
    ...query,
    partners: query.data?.partners || [],
    total: query.data?.total || 0,
    pagination: query.data?.pagination,
  };
}

