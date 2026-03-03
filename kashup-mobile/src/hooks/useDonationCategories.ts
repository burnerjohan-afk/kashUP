import { useCallback, useEffect, useState } from 'react';
import { DonationCategory, getDonationCategories } from '../services/donationService';

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger les associations.';
};

export const useDonationCategories = () => {
  const [data, setData] = useState<DonationCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const categories = await getDonationCategories();
      setData(categories);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { categories: data, loading, error, refetch: fetchData };
};


