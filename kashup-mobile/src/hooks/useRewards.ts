import { useCallback, useEffect, useState } from 'react';
import { hasRefreshToken } from '../services/api';
import {
  AvailableBoost,
  BadgeCatalogEntry,
  getAvailableBoosts,
  getBadgeCatalog,
  getRewardsSummary,
  getUserBadges,
  purchaseBoost,
  RewardSummary,
  UserBadge
} from '../services/rewardService';

type RewardsData = {
  summary: RewardSummary | null;
  userBadges: UserBadge[];
  availableBoosts: AvailableBoost[];
  badgeCatalog: BadgeCatalogEntry[];
};

const defaultData: RewardsData = {
  summary: null,
  userBadges: [],
  availableBoosts: [],
  badgeCatalog: []
};

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger les rewards.';
};

export const useRewards = () => {
  const [data, setData] = useState<RewardsData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boostPurchaseError, setBoostPurchaseError] = useState<string | null>(null);
  const [activeBoostPurchase, setActiveBoostPurchase] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isAuth = await hasRefreshToken();
      const [summary, userBadges, availableBoosts, badgeCatalog] = isAuth
        ? await Promise.all([
            getRewardsSummary().catch(() => null),
            getUserBadges().catch(() => []),
            getAvailableBoosts().catch(() => []),
            getBadgeCatalog().catch(() => [])
          ])
        : [
            null as RewardSummary | null,
            [] as UserBadge[],
            await getAvailableBoosts().catch(() => []),
            await getBadgeCatalog().catch(() => [])
          ];

      setData({
        summary,
        userBadges,
        availableBoosts,
        badgeCatalog
      });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const buyBoost = useCallback(
    async (boostId: string) => {
      setActiveBoostPurchase(boostId);
      setBoostPurchaseError(null);
      try {
        const result = await purchaseBoost(boostId);
        await fetchData();
        return result;
      } catch (err) {
        const message = formatError(err);
        setBoostPurchaseError(message);
        throw new Error(message);
      } finally {
        setActiveBoostPurchase(null);
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    buyBoost,
    boostPurchaseError,
    boostPurchaseInFlight: activeBoostPurchase
  };
};

