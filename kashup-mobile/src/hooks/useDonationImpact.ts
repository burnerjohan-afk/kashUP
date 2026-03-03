import { useCallback, useEffect, useState } from 'react';
import { DonationImpact, getDonationImpact } from '../services/donationService';

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de récupérer votre impact solidaire.';
};

export const useDonationImpact = () => {
  const [impact, setImpact] = useState<DonationImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImpact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDonationImpact();
      setImpact(data);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImpact();
  }, [fetchImpact]);

  return { impact, loading, error, refetch: fetchImpact };
};


