/**
 * Client API authentifié : Bearer token + refresh sur 401
 * À utiliser côté client avec un getToken fourni par AuthContext.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type StandardResponse<T> = {
  success: boolean;
  message?: string;
  data: T | null;
};

export type WalletSummary = {
  soldeCashback: number;
  soldePoints: number;
  soldeCoffreFort: number;
  coffreFortConfig?: { lockPeriodMonths: number; pointsPerEuroPerMonth: number };
  withdrawableCoffreFort?: number;
};

export type WalletTransaction = {
  id: string;
  partner: { id: string; name: string; logoUrl?: string | null };
  amount: number;
  cashbackEarned: number;
  pointsEarned: number;
  transactionDate: string;
  source: string;
  status: string;
};

export type RewardsSummary = {
  points: number;
  walletBalance: number;
  rewards: Array<{ id: string; name: string; multiplier: number; expiresAt: string }>;
};

export type GiftCardPurchase = {
  id: string;
  giftCard: {
    id: string;
    name: string;
    type?: string;
    value?: number;
    partner?: { id: string; name: string; logoUrl?: string | null };
  };
  createdAt?: string;
};

export type CoffreFortHistory = {
  versements: { amount: number; date: string }[];
  retraits: { amount: number; date: string }[];
  points: { points: number; date: string }[];
};

export async function fetchWithAuth<T>(
  path: string,
  options: RequestInit & { getToken: () => Promise<string | null>; onRefresh?: () => Promise<string | null> }
): Promise<T> {
  const { getToken, onRefresh, ...init } = options;
  let token = await getToken();
  if (!token && onRefresh) token = await onRefresh();

  const doFetch = (t: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers as Record<string, string>),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401 && onRefresh) {
    const newToken = await onRefresh();
    if (newToken) res = await doFetch(newToken);
  }

  if (!res.ok) {
    const err: StandardResponse<never> = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }

  const json: StandardResponse<T> = await res.json();
  if (!json.success || json.data === null) throw new Error(json.message || 'Erreur API');
  return json.data;
}

export function meWallet(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<WalletSummary>('/me/wallet', { method: 'GET', getToken, onRefresh });
}

export function meTransactions(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<WalletTransaction[]>('/me/transactions', { method: 'GET', getToken, onRefresh });
}

export function meWalletHistory(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<WalletTransaction[]>('/me/wallet/history', { method: 'GET', getToken, onRefresh });
}

export function meRewards(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<RewardsSummary>('/me/rewards', { method: 'GET', getToken, onRefresh });
}

export function meGiftCards(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<GiftCardPurchase[]>('/me/gift-cards', { method: 'GET', getToken, onRefresh });
}

export function meCoffreFortHistory(
  getToken: () => Promise<string | null>,
  onRefresh: () => Promise<string | null>
) {
  return fetchWithAuth<CoffreFortHistory>('/me/coffre-fort/history', { method: 'GET', getToken, onRefresh });
}

export function me(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<{ id: string; email: string; firstName?: string; lastName?: string; role: string; partnerId?: string | null }>('/me', {
    method: 'GET',
    getToken,
    onRefresh,
  });
}

export type PartnerDashboardStats = {
  summary: { uniqueUsers: number; totalTransactions: number; totalRevenue: number; totalCashback: number; averageBasket: number };
  groupBy: 'day' | 'month';
  series: { period: string; transactionCount: number; revenue: number; uniqueUsers: number }[];
  byGender: { M: { transactionCount: number; revenue: number; uniqueUsers: number }; F: { transactionCount: number; revenue: number; uniqueUsers: number }; other: { transactionCount: number; revenue: number; uniqueUsers: number } };
  byAgeRange: Record<string, { transactionCount: number; revenue: number; uniqueUsers: number }>;
  byDayOfWeek?: { day: number; dayLabel: string; M: number; F: number; other: number; total: number }[];
  byHour?: { hour: number; M: number; F: number; other: number; total: number }[];
  topSlotsByGender?: { dayOfWeek: number; dayLabel: string; hour: number; gender: string; transactionCount: number; revenue: number }[];
};
export function mePartner(getToken: () => Promise<string | null>, onRefresh: () => Promise<string | null>) {
  return fetchWithAuth<{ id: string; name: string; logoUrl?: string | null; category?: { id: string; name: string } }>('/me/partner', { method: 'GET', getToken, onRefresh });
}
export function mePartnerStats(
  params: { groupBy?: 'day' | 'month'; from?: string; to?: string },
  getToken: () => Promise<string | null>,
  onRefresh: () => Promise<string | null>
) {
  const q = new URLSearchParams();
  if (params.groupBy) q.set('groupBy', params.groupBy);
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  const query = q.toString();
  return fetchWithAuth<PartnerDashboardStats>(`/me/partner/stats${query ? `?${query}` : ''}`, { method: 'GET', getToken, onRefresh });
}

export type DonationImpact = { donatedThisMonth: number; donatedThisYear: number };
export function meDonationImpact(
  getToken: () => Promise<string | null>,
  onRefresh: () => Promise<string | null>
) {
  return fetchWithAuth<DonationImpact>('/me/donations/impact', { method: 'GET', getToken, onRefresh });
}

export function createDonation(
  associationId: string,
  amount: number,
  getToken: () => Promise<string | null>,
  onRefresh: () => Promise<string | null>
) {
  return fetchWithAuth<{ donationId: string; newSoldeCashback: number }>('/me/donations', {
    method: 'POST',
    getToken,
    onRefresh,
    body: JSON.stringify({ associationId, amount }),
  });
}
