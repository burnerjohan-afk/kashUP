import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { TERRITORIES } from '../types/domain';
import { AIAnalysisDTO } from '../types/dto';
import logger from '../utils/logger';

// Schéma de validation pour les filtres de l'analyse IA
// Accepte 'all' pour territory (tous les territoires)
const aiAnalysisFiltersSchema = z.object({
  territory: z.string().optional().transform((val) => {
    // Accepter 'all' pour tous les territoires
    if (!val || val === 'all' || val.trim() === '') return undefined;
    const normalized = val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    return TERRITORIES.includes(normalized as any) ? normalized : undefined;
  }),
  startDate: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }), // ISO 8601 date string
  endDate: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }) // ISO 8601 date string
});

/**
 * GET /admin/ai/analysis
 * Retourne une analyse IA avec KPIs, services, transactions quotidiennes, territoires, actions
 */
/**
 * GET /admin/ai/analysis
 * Retourne une analyse IA avec KPIs, services, transactions quotidiennes, territoires, actions
 * 
 * Query params (tous optionnels) :
 * - territory: Territoire ('all' pour tous, ou nom du territoire)
 * - startDate: Date de début (ISO 8601)
 * - endDate: Date de fin (ISO 8601)
 * 
 * Réponse : { statusCode, success, message, data: AIAnalysisDTO }
 */
export const getAIAnalysis = asyncHandler(async (req: Request, res: Response) => {
  // Retourner des données mockées simples et stables pour le développement
  const today = new Date();
  const mockData: AIAnalysisDTO = {
    kpis: {
      revenue: 50000,
      cashback: 2500,
      partners: 45,
      users: 1200
    },
    services: 15,
    dailyTransactions: [
      { date: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 45, revenue: 3200, cashback: 160 },
      { date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 52, revenue: 3800, cashback: 190 },
      { date: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 48, revenue: 3500, cashback: 175 },
      { date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 55, revenue: 4000, cashback: 200 },
      { date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 50, revenue: 3700, cashback: 185 },
      { date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 58, revenue: 4200, cashback: 210 },
      { date: today.toISOString().split('T')[0], count: 60, revenue: 4400, cashback: 220 }
    ],
    territories: [
      { territory: 'Martinique', users: 500, partners: 20, transactions: 200, revenue: 20000, cashback: 1000, growth: 5.5 },
      { territory: 'Guadeloupe', users: 450, partners: 15, transactions: 180, revenue: 18000, cashback: 900, growth: 3.2 },
      { territory: 'Guyane', users: 250, partners: 10, transactions: 100, revenue: 12000, cashback: 600, growth: 2.1 }
    ],
    actions: 8
  };

  sendSuccess(res, mockData, null, 200, 'Analyse IA récupérée avec succès');
});

/**
 * Génère des données mockées pour l'analyse IA
 */
function generateMockAIAnalysis(filters: z.infer<typeof aiAnalysisFiltersSchema>) {
  // KPIs de base
  const baseRevenue = 50000;
  const baseCashback = 2500;
  const basePartners = 45;
  const baseUsers = 1200;

  // Ajuster selon les filtres
  const territoryMultiplier = filters.territory ? 0.4 : 1; // Si filtre territoire, moins de données

  const kpis = {
    revenue: Math.floor(baseRevenue * territoryMultiplier * (0.8 + Math.random() * 0.4)),
    cashback: Math.floor(baseCashback * territoryMultiplier * (0.8 + Math.random() * 0.4)),
    partners: Math.floor(basePartners * territoryMultiplier * (0.8 + Math.random() * 0.4)),
    users: Math.floor(baseUsers * territoryMultiplier * (0.8 + Math.random() * 0.4))
  };

  // Services (nombre de services actifs)
  const services = Math.floor(15 + Math.random() * 10);

  // Transactions quotidiennes (7 derniers jours)
  const dailyTransactions = generateDailyTransactions(7, filters);

  // Statistiques par territoire
  const territories = generateTerritoriesStats(filters);

  // Actions (nombre d'actions recommandées par l'IA)
  const actions = Math.floor(5 + Math.random() * 10);

  return {
    kpis,
    services,
    dailyTransactions,
    territories,
    actions
  };
}

/**
 * Génère des transactions quotidiennes pour les N derniers jours
 */
function generateDailyTransactions(days: number, filters: z.infer<typeof aiAnalysisFiltersSchema>): Array<{
  date: string;
  count: number;
  revenue: number;
  cashback: number;
}> {
  const transactions = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseCount = 50;
    const count = Math.floor(baseCount * (0.7 + Math.random() * 0.6));
    const revenue = Math.floor(count * (60 + Math.random() * 80));
    const cashback = Math.floor(revenue * 0.05 * (0.8 + Math.random() * 0.4));

    transactions.push({
      date: date.toISOString().split('T')[0], // Format YYYY-MM-DD
      count,
      revenue,
      cashback
    });
  }

  return transactions;
}

/**
 * Génère des statistiques par territoire
 */
function generateTerritoriesStats(filters: z.infer<typeof aiAnalysisFiltersSchema>): Array<{
  territory: string;
  users: number;
  partners: number;
  transactions: number;
  revenue: number;
  cashback: number;
  growth: number; // Pourcentage de croissance
}> {
  const territories = filters.territory 
    ? [filters.territory] 
    : TERRITORIES;

  return territories.map(territory => {
    const baseUsers = 400;
    const basePartners = 15;
    const baseTransactions = 200;
    const baseRevenue = 15000;
    
    const users = Math.floor(baseUsers * (0.8 + Math.random() * 0.4));
    const partners = Math.floor(basePartners * (0.8 + Math.random() * 0.4));
    const transactions = Math.floor(baseTransactions * (0.8 + Math.random() * 0.4));
    const revenue = Math.floor(baseRevenue * (0.8 + Math.random() * 0.4));
    const cashback = Math.floor(revenue * 0.05 * (0.8 + Math.random() * 0.4));
    const growth = Number((Math.random() * 20 - 5).toFixed(2)); // Entre -5% et +15%

    return {
      territory,
      users,
      partners,
      transactions,
      revenue,
      cashback,
      growth
    };
  });
}

