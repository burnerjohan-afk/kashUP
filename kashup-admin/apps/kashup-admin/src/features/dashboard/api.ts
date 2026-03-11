import { getJson, getStandardJson } from '@/lib/api/client';
import { unwrapResponse, unwrapStandardResponse } from '@/lib/api/response';
import type { Territory, WebhookEvent } from '@/types/entities';
// Réexport des types et fonctions depuis l'API centralisée
import type {
  StatisticsTableFilters,
  StatisticsTableRow,
  DepartmentStatistics,
  AIAnalysis as AdminAIAnalysis,
} from '@/api/admin';
import {
  getStatisticsTable,
  getStatisticsDepartments,
  getAiAnalysis,
} from '@/api/admin';
import { normalizeDashboard, normalizeArray, type NormalizedDashboard } from './normalizeDashboard';

export type DashboardKpis = {
  cashbackVolume: number;
  pointsInjected: number;
  activeUsers: number;
  activePartners: number;
  // Champs compatibles avec l'API (optionnels)
  revenue?: number;
  cashback?: number;
  partners?: number;
  users?: number;
};

export type DailyTransactionPoint = {
  date: string;
  transactions: number;
  cashbackVolume: number;
  pointsVolume: number;
};

export type TerritoryBreakdown = {
  territory: Territory;
  transactions: number;
  cashbackVolume: number;
};

export type ServiceStatus = {
  name: 'Powens' | 'Drimify' | 'Notifications' | 'Webhooks' | 'Prometheus';
  status: 'up' | 'warning' | 'down';
  latencyMs: number;
  incidents24h: number;
  lastCheckedAt: string;
};

export type DashboardSummary = {
  kpis: DashboardKpis;
  dailyTransactions: DailyTransactionPoint[];
  territories: TerritoryBreakdown[];
  recentWebhooks: WebhookEvent[];
  services: ServiceStatus[];
  servicesCount?: number;
  totals?: {
    totalUsers: number;
    totalTransactions: number;
    totalVolume: number;
    totalCashback: number;
    totalPoints: number;
    totalDonations: number;
  };
};

export type ImpactStat = {
  territory: Territory;
  co2SavedKg: number;
  donationsEur: number;
  localShopsSupported: number;
};

// Type pour les données brutes de l'API (format actuel)
type RawDashboardData = {
  // Ancien format (clé/valeur à aplatir)
  totalUtilisateurs?: number;
  totalTransactions?: number;
  'volume total'?: number;
  totalCashback?: number;
  totalPoints?: number;
  totalDonations?: number;
  // Nouveau format (déjà structuré)
  kpis?: DashboardKpis;
  dailyTransactions?: DailyTransactionPoint[];
  territories?: TerritoryBreakdown[];
  recentWebhooks?: WebhookEvent[];
  services?: ServiceStatus[];
};

// Fonction pour transformer les données de l'API vers le format attendu
export const fetchDashboardSummary = async (territory?: Territory | 'all') => {
  const params = territory ? { territory } : undefined;

  const logTransformed = (label: string, data: DashboardSummary | NormalizedDashboard) => {
    if (!import.meta.env.DEV) return;
    console.log(`📊 Données ${label}:`, {
      data,
      keys: data && typeof data === 'object' ? Object.keys(data) : [],
    });
  };

  // Retourner des valeurs par défaut en cas d'erreur
  const defaultResponse = {
    kpis: {
      cashbackVolume: 0,
      pointsInjected: 0,
      activeUsers: 0,
      activePartners: 0,
    },
    dailyTransactions: [] as DailyTransactionPoint[],
    territories: [] as TerritoryBreakdown[],
    recentWebhooks: [] as WebhookEvent[],
    services: [] as ServiceStatus[],
    servicesCount: 0,
    totals: {
      totalUsers: 0,
      totalTransactions: 0,
      totalVolume: 0,
      totalCashback: 0,
      totalPoints: 0,
      totalDonations: 0,
    },
  };

  // 1) Essayer le format standard (success/data/statusCode)
  try {
    const standardResponse = await getStandardJson<DashboardSummary | RawDashboardData>('admin/dashboard', params);
    const standardData = unwrapStandardResponse(standardResponse);
    const normalized = normalizeDashboard(standardData);
    logTransformed('transformées (StandardResponse)', normalized);
    return {
      kpis: normalized.kpis,
      dailyTransactions: normalized.dailyTransactions,
      territories: normalized.territories,
      recentWebhooks: (normalized.recentWebhooks || []) as WebhookEvent[],
      services: (normalized.servicesList || []) as ServiceStatus[],
      servicesCount: normalized.servicesCount || 0,
      totals: normalized.totals || defaultResponse.totals,
    };
  } catch (standardError) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Format standard non utilisé, tentative de fallback ApiResponse:', standardError);
    }
  }

  // 2) Fallback ApiResponse (ancien format { data, error })
  try {
    const legacyResponse = await getJson<RawDashboardData | DashboardSummary>('admin/dashboard', params);
    const legacyData = unwrapResponse(legacyResponse);
    const normalized = normalizeDashboard(legacyData);
    logTransformed('transformées (ApiResponse)', normalized);
    return {
      kpis: normalized.kpis,
      dailyTransactions: normalized.dailyTransactions,
      territories: normalized.territories,
      recentWebhooks: (normalized.recentWebhooks || []) as WebhookEvent[],
      services: (normalized.servicesList || []) as ServiceStatus[],
      servicesCount: normalized.servicesCount || 0,
      totals: normalized.totals || defaultResponse.totals,
    };
  } catch (legacyError) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la récupération du dashboard:', legacyError);
    }
    // Retourner des valeurs par défaut pour éviter les crashes
    return defaultResponse;
  }
};

export const fetchImpactStats = async (territory?: Territory | 'all') => {
  try {
    const response = await getJson<ImpactStat[] | { items?: ImpactStat[]; stats?: ImpactStat[] }>('stats/impact-local', territory ? { territory } : undefined);
    const data = unwrapResponse(response);
    
    if (import.meta.env.DEV) {
      console.log('🌍 Données d\'impact reçues:', {
        data,
        isArray: Array.isArray(data),
        dataType: typeof data,
        dataKeys: data && typeof data === 'object' ? Object.keys(data) : null,
      });
    }
    
    // Si l'API retourne directement un tableau, l'utiliser
    if (Array.isArray(data)) {
      // Vérifier que chaque élément a la bonne structure et filtrer les items invalides
      return data
        .filter((item) => item && (item.territory || item.co2SavedKg !== undefined || item.donationsEur !== undefined))
        .map((item, index) => {
          try {
            // Si territory est un objet avec id et name, extraire le nom
            if (item.territory && typeof item.territory === 'object' && 'name' in item.territory) {
              const territoryObj = item.territory as { id?: string; name?: string };
              return {
                ...item,
                territory: (territoryObj.name || `territory-${index}`) as Territory,
              };
            }
            // Si territory est une string, l'utiliser directement
            if (typeof item.territory === 'string') {
              return item;
            }
            // Si territory est manquant ou invalide, utiliser un fallback
            return {
              ...item,
              territory: `territory-${index}` as Territory,
            };
          } catch (error) {
            // En cas d'erreur lors de la transformation, retourner un item sécurisé
            if (import.meta.env.DEV) {
              console.warn('⚠️ Erreur lors de la transformation d\'un item d\'impact:', error, item);
            }
            return {
              ...item,
              territory: `territory-${index}` as Territory,
              co2SavedKg: item.co2SavedKg ?? 0,
              donationsEur: item.donationsEur ?? 0,
              localShopsSupported: item.localShopsSupported ?? 0,
            };
          }
        });
    }
    
    // Si l'API retourne un objet avec une propriété items ou stats
    if (data && typeof data === 'object') {
      if ('items' in data && Array.isArray(data.items)) {
        return data.items.filter((item) => item && item.territory);
      }
      if ('stats' in data && Array.isArray(data.stats)) {
        return data.stats.filter((item) => item && item.territory);
      }
    }
    
    // Par défaut, retourner un tableau vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Format de données inattendu pour les stats d\'impact, retour d\'un tableau vide');
    }
    
    return [];
  } catch (error) {
    // Encapsuler toute erreur et retourner un tableau vide
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la récupération des stats d\'impact:', error);
    }
    return [];
  }
};

// Alias pour compatibilité avec le code existant
export type StatisticsFilters = StatisticsTableFilters;
export type StatisticsTableData = StatisticsTableRow;
export type DepartmentGlobalStats = DepartmentStatistics;

/**
 * Récupère les statistiques détaillées avec filtres avancés
 * 
 * ENDPOINT: GET /admin/statistics/table
 * 
 * QUERY PARAMS (tous optionnels):
 * - territory?: 'martinique' | 'guadeloupe' | 'guyane' | 'all' (si 'all', non envoyé)
 * - sector?: string (si 'all' ou chaîne vide, non envoyé)
 * - month?: string (1-12, si 'all', non envoyé)
 * - day?: string (0-6, si 'all', non envoyé)
 * - timeSlot?: string (si 'all', non envoyé)
 * - gender?: 'male' | 'female' | 'all' (si 'all', non envoyé)
 * - ageRange?: string (si 'all', non envoyé)
 * 
 * NOTE: Gère les erreurs 404/400 en retournant un tableau vide pour éviter les crashes
 */
export const fetchStatisticsTable = async (filters: StatisticsFilters) => {
  try {
    // Nettoyer les paramètres : ne pas envoyer 'all' ou chaînes vides
    const cleanFilters: Record<string, string> = {};
    
    if (filters.territory && filters.territory !== 'all') {
      cleanFilters.territory = filters.territory;
    }
    if (filters.sector && filters.sector !== 'all' && filters.sector.trim() !== '') {
      cleanFilters.sector = filters.sector;
    }
    if (filters.month && filters.month !== 'all') {
      cleanFilters.month = filters.month;
    }
    if (filters.day && filters.day !== 'all') {
      cleanFilters.day = filters.day;
    }
    if (filters.timeSlot && filters.timeSlot !== 'all') {
      cleanFilters.timeSlot = filters.timeSlot;
    }
    if (filters.gender && filters.gender !== 'all') {
      cleanFilters.gender = filters.gender;
    }
    if (filters.ageRange && filters.ageRange !== 'all') {
      cleanFilters.ageRange = filters.ageRange;
    }
    
    return await getStatisticsTable(cleanFilters);
  } catch (error) {
    // Si l'endpoint n'existe pas (404) ou erreur serveur (500), retourner un tableau vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération des statistiques (table):', error);
    }
    return [];
  }
};

/**
 * Récupère les statistiques globales par département
 * 
 * ENDPOINT: GET /admin/statistics/departments
 * 
 * QUERY PARAMS: Aucun
 * 
 * NOTE: Gère les erreurs 404/400 en retournant un tableau vide pour éviter les crashes
 */
export const fetchDepartmentGlobalStats = async () => {
  try {
    return await getStatisticsDepartments();
  } catch (error) {
    // Si l'endpoint n'existe pas (404) ou erreur serveur (500), retourner un tableau vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération des statistiques (departments):', error);
    }
    return [];
  }
};

export type StatisticsDetailData = {
  current: {
    transactions: number;
    averageBasket: number;
    totalAmount: number;
  };
  evolutionM1: {
    previous: {
      transactions: number;
      averageBasket: number;
      totalAmount: number;
    };
    transactionGrowth: number;
    averageBasketGrowth: number;
    totalAmountGrowth: number;
  };
  evolutionN1: {
    previous: {
      transactions: number;
      averageBasket: number;
      totalAmount: number;
    };
    transactionGrowth: number;
    averageBasketGrowth: number;
    totalAmountGrowth: number;
  };
  monthlyEvolution: Array<{
    month: string;
    transactions: number;
    averageBasket: number;
  }>;
  comparison: Array<{
    period: string;
    transactions: number;
    averageBasket: number;
    totalAmount: number;
  }>;
};

/**
 * Récupère les détails d'une statistique spécifique
 * 
 * ENDPOINT: GET /admin/statistics/detail
 * 
 * QUERY PARAMS:
 * - period: string (obligatoire, libellé de la période)
 * - territory?: string (optionnel, si présent dans filters)
 * - sector?: string (optionnel, si présent dans filters)
 * - month?: string (optionnel, si présent dans filters)
 * - day?: string (optionnel, si présent dans filters)
 * - timeSlot?: string (optionnel, si présent dans filters)
 * - gender?: string (optionnel, si présent dans filters)
 * - ageRange?: string (optionnel, si présent dans filters)
 * 
 * NOTE: Gère les erreurs 404/400 en retournant des données par défaut pour éviter les crashes
 */
export const fetchStatisticsDetail = async (
  data: StatisticsTableData,
  filters: Record<string, string>,
) => {
  try {
    // Nettoyer les paramètres : ne pas envoyer 'all' ou chaînes vides
    const cleanFilters: Record<string, string> = {
      period: data.period,
    };
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value.trim() !== '') {
        cleanFilters[key] = value;
      }
    });
    
    const response = await getJson<StatisticsDetailData>('admin/statistics/detail', cleanFilters);
    return unwrapResponse(response);
  } catch (error) {
    // Si l'endpoint n'existe pas (404) ou erreur serveur (500), retourner des données par défaut
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération des détails de statistiques:', error);
    }
    // Retourner une structure vide mais valide pour éviter les crashes
    return {
      current: {
        transactions: 0,
        averageBasket: 0,
        totalAmount: 0,
      },
      evolutionM1: {
        previous: { transactions: 0, averageBasket: 0, totalAmount: 0 },
        transactionGrowth: 0,
        averageBasketGrowth: 0,
        totalAmountGrowth: 0,
      },
      evolutionN1: {
        previous: { transactions: 0, averageBasket: 0, totalAmount: 0 },
        transactionGrowth: 0,
        averageBasketGrowth: 0,
        totalAmountGrowth: 0,
      },
      monthlyEvolution: [],
      comparison: [],
    };
  }
};

// Réexport du type AIAnalysis depuis l'API centralisée
export type AIAnalysis = AdminAIAnalysis;

/**
 * Récupère l'analyse IA des statistiques pour un territoire donné
 * 
 * ENDPOINT: GET /admin/ai/analysis
 * 
 * QUERY PARAMS:
 * - territory?: 'martinique' | 'guadeloupe' | 'guyane' | 'all' (défaut: 'all', si 'all', non envoyé)
 * 
 * NOTE: Gère les erreurs 404/400 en retournant une analyse vide pour éviter les crashes
 */
export const fetchAIAnalysis = async (territory: Territory | 'all') => {
  try {
    // Ne pas envoyer 'all' si c'est la valeur par défaut
    const cleanTerritory = territory === 'all' ? undefined : territory;
    return await getAiAnalysis(cleanTerritory || 'all');
  } catch (error) {
    // Si l'endpoint n'existe pas (404) ou erreur serveur (500), retourner une analyse vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération de l\'analyse IA:', error);
    }
    return {
      summary: 'L\'analyse IA n\'est pas disponible pour le moment.',
      evolutionAnalysis: 'Les données d\'évolution ne sont pas disponibles.',
      actionPlan: [],
    };
  }
};

