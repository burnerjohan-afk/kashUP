import { useCallback, useEffect, useState } from 'react';
import {
  getCurrentJackpot,
  getJackpotStats,
  participateJackpot,
  type CurrentJackpot,
  type UserJackpotStats,
} from '../services/jackpotService';

export function useJackpot() {
  const [jackpot, setJackpot] = useState<CurrentJackpot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJackpot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentJackpot();
      setJackpot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le jackpot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJackpot();
  }, [fetchJackpot]);

  return {
    jackpot,
    loading,
    error,
    refetch: fetchJackpot,
  };
}

export function useJackpotStats() {
  const [stats, setStats] = useState<UserJackpotStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJackpotStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger tes stats jackpot.');
    } finally {
      setLoading(false);
    }
  }, []);

  const participate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await participateJackpot();
      if (data) setStats(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Participation impossible.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    participate,
  };
}
