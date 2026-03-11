type AnyObj = Record<string, any>;

const toObj = (v: any): AnyObj => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const toNumber = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const toArray = <T = any>(v: any): T[] => (Array.isArray(v) ? v : []);

export type NormalizedDashboard = {
  kpis: {
    // Mapping API générique
    revenue: number;
    cashback: number;
    partners: number;
    users: number;
    // Compatibilité avec les composants existants
    cashbackVolume: number;
    pointsInjected: number;
    activeUsers: number;
    activePartners: number;
  };
  servicesCount: number;
  servicesList: any[];
  recentWebhooks: any[];
  recentWebhooksCount: number;
  territories: any[];
  dailyTransactions: any[];
  totals: {
    totalUsers: number;
    totalTransactions: number;
    totalVolume: number;
    totalCashback: number;
    totalPoints: number;
    totalDonations: number;
  };
};

export const normalizeDashboard = (payload: any): NormalizedDashboard => {
  const root = toObj(payload);
  const d = toObj(root.data ?? root);

  const kpisRaw = toObj(d.kpis);
  const servicesRaw = d.services;
  const servicesList = toArray(servicesRaw);
  const servicesCount = typeof servicesRaw === 'number' ? toNumber(servicesRaw, 0) : servicesList.length;

  const recentWebhooks = toArray(d.recentWebhooks);

  const revenue = toNumber(kpisRaw.revenue ?? kpisRaw.totalRevenue ?? d.totalVolume ?? d['volume total'], 0);
  const cashback = toNumber(kpisRaw.cashback ?? kpisRaw.totalCashback ?? d.totalCashback, 0);
  const partners = toNumber(kpisRaw.partners ?? kpisRaw.activePartners ?? d.totalPartners, 0);
  const users = toNumber(kpisRaw.users ?? kpisRaw.activeUsers ?? d.totalUsers ?? d.totalUtilisateurs, 0);
  const pointsInjected = toNumber(kpisRaw.pointsInjected ?? d.totalPoints, 0);

  return {
    kpis: {
      revenue,
      cashback,
      partners,
      users,
      cashbackVolume: cashback,
      pointsInjected,
      activeUsers: users,
      activePartners: partners,
    },
    servicesCount,
    servicesList,
    recentWebhooks,
    recentWebhooksCount: toNumber(d.recentWebhooks, 0) || recentWebhooks.length,
    territories: toArray(d.territories),
    dailyTransactions: toArray(d.dailyTransactions),
    totals: {
      totalUsers: toNumber(d.totalUsers ?? d.totalUtilisateurs, 0),
      totalTransactions: toNumber(d.totalTransactions, 0),
      totalVolume: toNumber(d.totalVolume ?? d['volume total'], 0),
      totalCashback: toNumber(d.totalCashback, 0),
      totalPoints: toNumber(d.totalPoints, 0),
      totalDonations: toNumber(d.totalDonations, 0),
    },
  };
};

export const normalizeArray = toArray;
export const normalizeNumber = toNumber;

