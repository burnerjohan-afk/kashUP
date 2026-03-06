import { useQuery } from '@tanstack/react-query';
import { fetchCurrentOffers } from '@/src/services/offers';

export function useCurrentOffers() {
  const query = useQuery({
    queryKey: ['offers', 'current'],
    queryFn: fetchCurrentOffers,
    staleTime: 60 * 1000,
  });
  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
