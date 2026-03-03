import { useCallback, useEffect, useState } from 'react';
import { hasRefreshToken } from '../services/api';
import {
  getCommunityImpact,
  getWalletHistory,
  getWalletSummary,
  ImpactStats,
  WalletSummary,
  WalletTransaction
} from '../services/walletService';

type PersonalImpact = {
  monthlyInjected: number;
  monthlyCashback: number;
  target: number;
  merchantsHelped: number;
  purchasesCount: number;
  boostRate: number;
};

export type WalletHookData = {
  wallet: WalletSummary | null;
  history: WalletTransaction[];
  communityImpact: ImpactStats | null;
  personalImpact: PersonalImpact;
};

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Une erreur inattendue est survenue.';
};

const computePersonalImpact = (transactions: WalletTransaction[]): PersonalImpact => {
  const now = new Date();
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.transactionDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const monthlyInjected = monthlyTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const monthlyCashback = monthlyTransactions.reduce((sum, txn) => sum + txn.cashbackEarned, 0);
  const totalAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
  const totalCashback = transactions.reduce((sum, txn) => sum + txn.cashbackEarned, 0);
  const merchantsHelped = new Set(transactions.map((txn) => txn.partner?.id).filter(Boolean)).size;
  const boostRate = totalAmount > 0 ? (totalCashback / totalAmount) * 100 : 0;

  return {
    monthlyInjected,
    monthlyCashback,
    target: monthlyInjected > 0 ? monthlyInjected * 1.2 : 500,
    merchantsHelped,
    purchasesCount: transactions.length,
    boostRate
  };
};

export const useWallet = () => {
  const [data, setData] = useState<WalletHookData>({
    wallet: null,
    history: [],
    communityImpact: null,
    personalImpact: {
      monthlyInjected: 0,
      monthlyCashback: 0,
      target: 500,
      merchantsHelped: 0,
      purchasesCount: 0,
      boostRate: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isAuth = await hasRefreshToken();
      if (!isAuth) {
        setData({
          wallet: null,
          history: [],
          communityImpact: null,
          personalImpact: {
            monthlyInjected: 0,
            monthlyCashback: 0,
            target: 500,
            merchantsHelped: 0,
            purchasesCount: 0,
            boostRate: 0
          }
        });
        return;
      }
      const [wallet, history, impact] = await Promise.all([
        getWalletSummary().catch(() => null),
        getWalletHistory().catch(() => []),
        getCommunityImpact().catch(() => null)
      ]);

      setData({
        wallet,
        history,
        communityImpact: impact,
        personalImpact: computePersonalImpact(history || [])
      });
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

