import { useCallback, useEffect, useState } from 'react';
import { hasRefreshToken } from '../services/api';
import {
  getGiftCards,
  getUserGiftCards,
  GiftCard,
  GiftCardPurchase,
  purchaseGiftCard,
  PurchaseGiftCardPayload
} from '../services/giftCardService';

type GiftCardsData = {
  catalog: GiftCard[];
  purchases: GiftCardPurchase[];
};

const defaultData: GiftCardsData = {
  catalog: [],
  purchases: []
};

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger les bons d’achat.';
};

export const useGiftCards = () => {
  const [data, setData] = useState<GiftCardsData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await getGiftCards();
      const isAuth = await hasRefreshToken();
      const purchases = isAuth ? await getUserGiftCards().catch(() => []) : [];
      setData({ catalog, purchases });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const executePurchase = useCallback(
    async (payload: PurchaseGiftCardPayload) => {
      setPurchasing(true);
      setPurchaseError(null);
      try {
        const purchase = await purchaseGiftCard(payload);
        setData((current) => ({
          ...current,
          purchases: [purchase, ...current.purchases]
        }));
        return purchase;
      } catch (err) {
        const message = formatError(err);
        setPurchaseError(message);
        throw new Error(message);
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    purchase: executePurchase,
    purchasing,
    purchaseError
  };
};

