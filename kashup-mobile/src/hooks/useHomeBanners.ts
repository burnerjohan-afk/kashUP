import { useCallback, useEffect, useState } from 'react';
import { getHomeBanners, type HomeBanner } from '../services/homeBannerService';

export function useHomeBanners() {
  const [data, setData] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const banners = await getHomeBanners();
      setData(banners);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement des bannières');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
