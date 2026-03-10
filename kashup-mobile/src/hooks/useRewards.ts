import { useCallback, useEffect, useState } from 'react';
import { hasRefreshToken } from '../services/api';
import type { ChallengeCategory, RewardChallenge } from '../../types/rewards';
import {
  AvailableBoost,
  BadgeCatalogEntry,
  getAvailableBoosts,
  getBadgeCatalog,
  getChallengeCategories,
  getChallenges,
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
  challenges: RewardChallenge[];
  challengeCategories: ChallengeCategory[];
};

const defaultData: RewardsData = {
  summary: null,
  userBadges: [],
  availableBoosts: [],
  badgeCatalog: [],
  challenges: [],
  challengeCategories: [],
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
      const [summary, userBadges, availableBoosts, badgeCatalog, challenges, challengeCategories] = await Promise.all([
        isAuth ? getRewardsSummary().catch(() => null) : Promise.resolve(null as RewardSummary | null),
        isAuth ? getUserBadges().catch(() => []) : Promise.resolve([] as UserBadge[]),
        getAvailableBoosts().catch(() => []),
        getBadgeCatalog().catch(() => []),
        getChallenges().catch(() => []),
        isAuth ? getChallengeCategories().catch(() => []) : Promise.resolve([] as ChallengeCategory[]),
      ]);

      setData({
        summary,
        userBadges,
        availableBoosts,
        badgeCatalog,
        challenges: challenges ?? [],
        challengeCategories: challengeCategories ?? [],
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

