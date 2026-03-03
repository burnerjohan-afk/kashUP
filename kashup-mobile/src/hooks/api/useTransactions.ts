/**
 * Hook React Query pour les transactions
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { getLastSync, setLastSync } from '../../services/sync/deltaSync';

export interface Transaction {
  id: string;
  userId: string;
  partnerId?: string;
  amount: number;
  cashbackEarned: number;
  pointsEarned?: number;
  transactionDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  updatedSince?: string;
  partnerId?: string;
  status?: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
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

async function fetchTransactions(params: ListParams = {}): Promise<TransactionsResponse> {
  const response = await apiClient.get<TransactionsResponse>('/transactions', {
    params,
  });

  return response.data;
}

export function useTransactions(listParams: ListParams = {}) {
  const [lastSync, setLastSyncState] = useState<string | null>(null);

  useEffect(() => {
    getLastSync('transactions').then(setLastSyncState);
  }, []);

  const queryParams = {
    ...listParams,
    ...(lastSync && !listParams.updatedSince ? { updatedSince: lastSync } : {}),
  };

  const query = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => fetchTransactions(queryParams),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.isSuccess) {
      setLastSync('transactions', new Date().toISOString());
    }
  }, [query.isSuccess]);

  return {
    ...query,
    transactions: query.data?.transactions || [],
    total: query.data?.total || 0,
    pagination: query.data?.pagination,
  };
}

