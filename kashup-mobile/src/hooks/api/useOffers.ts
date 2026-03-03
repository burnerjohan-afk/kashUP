/**
 * Hook React Query pour les offres
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { getLastSync, setLastSync } from '../../services/sync/deltaSync';

export interface Offer {
  id: string;
  partnerId: string;
  title: string;
  description?: string;
  type: 'welcome' | 'permanent' | 'voucher';
  discount?: number;
  cashback?: number;
  points?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  updatedSince?: string;
  partnerId?: string;
  type?: string;
}

export interface OffersResponse {
  offers: Offer[];
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

async function fetchOffers(params: ListParams = {}): Promise<OffersResponse> {
  const response = await apiClient.get<OffersResponse>('/offers', {
    params,
  });

  return response.data;
}

export function useOffers(listParams: ListParams = {}) {
  const [lastSync, setLastSyncState] = useState<string | null>(null);

  useEffect(() => {
    getLastSync('offers').then(setLastSyncState);
  }, []);

  const queryParams = {
    ...listParams,
    ...(lastSync && !listParams.updatedSince ? { updatedSince: lastSync } : {}),
  };

  const query = useQuery({
    queryKey: ['offers', queryParams],
    queryFn: () => fetchOffers(queryParams),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setLastSync('offers', new Date().toISOString());
    }
  }, [query.isSuccess]);

  return {
    ...query,
    offers: query.data?.offers || [],
    total: query.data?.total || 0,
    pagination: query.data?.pagination,
  };
}

