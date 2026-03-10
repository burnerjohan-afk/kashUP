import { useCallback, useEffect, useState } from 'react';
import { listLotteries, listLotteriesForHome, type Lottery } from '../services/lotteryService';

export function useLotteries() {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLotteries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLotteries();
      setLotteries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les loteries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]);

  return {
    lotteries,
    loading,
    error,
    refetch: fetchLotteries,
  };
}

export function useLotteriesForHome() {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLotteries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listLotteriesForHome();
      setLotteries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les loteries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotteries();
  }, [fetchLotteries]);

  return {
    lotteries,
    loading,
    error,
    refetch: fetchLotteries,
  };
}
