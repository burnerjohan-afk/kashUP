/**
 * Hook React Query pour les récompenses
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { getLastSync, setLastSync } from '../../services/sync/deltaSync';

export interface Reward {
  id: string;
  userId: string;
  type: string;
  amount: number;
  points?: number;
  description?: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  updatedSince?: string;
  status?: string;
}

export interface RewardsResponse {
  rewards: Reward[];
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

async function fetchRewards(params: ListParams = {}): Promise<RewardsResponse> {
  const response = await apiClient.get<RewardsResponse>('/rewards', {
    params,
  });

  return response.data;
}

export function useRewards(listParams: ListParams = {}) {
  const [lastSync, setLastSyncState] = useState<string | null>(null);

  useEffect(() => {
    getLastSync('rewards').then(setLastSyncState);
  }, []);

  const queryParams = {
    ...listParams,
    ...(lastSync && !listParams.updatedSince ? { updatedSince: lastSync } : {}),
  };

  const query = useQuery({
    queryKey: ['rewards', queryParams],
    queryFn: () => fetchRewards(queryParams),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setLastSync('rewards', new Date().toISOString());
    }
  }, [query.isSuccess]);

  return {
    ...query,
    rewards: query.data?.rewards || [],
    total: query.data?.total || 0,
    pagination: query.data?.pagination,
  };
}

