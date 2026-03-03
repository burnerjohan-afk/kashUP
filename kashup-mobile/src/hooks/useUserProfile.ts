import { useCallback, useEffect, useState } from 'react';
import { hasRefreshToken } from '../services/api';
import { getUserProfile, UserProfile } from '../services/userService';

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger votre profil.';
};

export const useUserProfile = () => {
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isAuth = await hasRefreshToken();
      if (!isAuth) {
        setData(null);
        return;
      }
      const profile = await getUserProfile();
      setData(profile);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

