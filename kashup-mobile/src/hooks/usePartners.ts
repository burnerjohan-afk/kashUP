import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPartnerCategories,
  getPartners,
  invalidateCategoriesCache,
  invalidatePartnersCache,
  Partner,
  PartnerCategory,
  PartnerFilters,
} from '../services/partnerService';

export type PartnersHookData = {
  partners: Partner[];
  categories: PartnerCategory[];
};

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger les partenaires.';
};

const DEBOUNCE_MS = 250;

export const usePartners = (filters?: PartnerFilters) => {
  const [data, setData] = useState<PartnersHookData>({ partners: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serializedFilters = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const parsedFilters = useMemo<PartnerFilters | undefined>(() => {
    return filters ? { ...filters } : undefined;
  }, [serializedFilters]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categories, partners] = await Promise.all([
        getPartnerCategories(),
        getPartners(parsedFilters)
      ]);
      setData({ categories, partners });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, [parsedFilters, serializedFilters]);

  const refetch = useCallback(() => {
    invalidateCategoriesCache();
    invalidatePartnersCache();
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchData();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch };
};

