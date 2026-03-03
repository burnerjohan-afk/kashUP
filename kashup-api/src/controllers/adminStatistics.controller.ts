import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { TERRITORIES } from '../types/domain';
import { StatisticsTableDTO, StatisticsTableRowDTO, DepartmentStatisticsDTO } from '../types/dto';
import logger from '../utils/logger';
import prisma from '../config/prisma';

// Schéma de validation pour les filtres de la table
// Accepte 'all' pour territory (tous les territoires)
const statisticsTableFiltersSchema = z.object({
  territory: z.string().optional().transform((val) => {
    if (!val || val === 'all' || val.trim() === '') return undefined;
    const normalized = val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    return TERRITORIES.includes(normalized as any) ? normalized : undefined;
  }),
  allDay: z.string().transform((val) => val === 'true' || val === '1').optional(),
  timeSlot: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  }),
  gender: z.enum(['M', 'F', 'other']).optional(),
  ageRange: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return undefined;
    return val.trim();
  })
});

// Schéma de validation pour les départements
// Accepte 'all' pour territory (tous les territoires)
const departmentsFiltersSchema = z.object({
  territory: z.string().optional().transform((val) => {
    if (!val || val === 'all' || val.trim() === '') return undefined;
    const normalized = val.trim().charAt(0).toUpperCase() + val.trim().slice(1).toLowerCase();
    return TERRITORIES.includes(normalized as any) ? normalized : undefined;
  })
});

/**
 * GET /admin/statistics/table
 * Retourne un tableau de statistiques filtré selon les critères
 * NOTE: ageRange et gender ne sont pas stockés dans la DB, donc on retourne des valeurs par défaut
 */
export const getStatisticsTable = asyncHandler(async (req: Request, res: Response) => {
  const filters = statisticsTableFiltersSchema.parse(req.query);
  
  // Log temporaire pour déboguer
  logger.info({ filters, query: req.query }, '📊 Statistiques table - filtres reçus');

  // Construire le where pour les transactions
  const where: any = {
    status: 'confirmed' // Uniquement les transactions confirmées
  };

  // Filtrer par territoire si spécifié (via le partenaire ou l'utilisateur)
  // Note: territories est stocké comme string JSON dans Partner, on filtre côté application
  // Pour l'instant, on récupère toutes les transactions et on filtre après

  // Filtrer par créneau horaire si spécifié
  if (filters.timeSlot && !filters.allDay) {
    const hour = getHourFromTimeSlot(filters.timeSlot);
    if (hour !== null) {
      // SQLite ne supporte pas directement les fonctions de date, on filtre côté application
      // Pour l'instant, on ne filtre pas par timeSlot au niveau DB
    }
  }

  // Récupérer toutes les transactions confirmées avec les filtres
  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          territory: true
        }
      },
      partner: {
        select: {
          id: true,
          name: true,
          territories: true
        }
      }
    }
  });

  // Log temporaire pour déboguer
  logger.info({ transactionCount: transactions.length }, '📊 Statistiques table - transactions trouvées');

  // Si aucune transaction, retourner structure vide
  if (transactions.length === 0) {
    const emptyData: StatisticsTableDTO = {
      rows: [],
      totals: {
        count: 0,
        transactions: 0,
        revenue: 0,
        cashback: 0,
        averageTransaction: 0
      },
      filters: {
        territory: filters.territory || null,
        allDay: filters.allDay || false,
        timeSlot: filters.timeSlot || null,
        gender: filters.gender || null,
        ageRange: filters.ageRange || null
      }
    };
    logger.info('📊 Statistiques table - base vide, retour structure vide');
    return sendSuccess(res, emptyData, null, 200, 'Statistiques de table récupérées avec succès');
  }

  // Grouper les transactions par territoire et timeSlot
  const grouped = new Map<string, {
    territory: string;
    timeSlot: string | null;
    transactions: typeof transactions;
  }>();

  transactions.forEach(txn => {
    // Parser territories depuis JSON string si nécessaire
    let partnerTerritories: string[] = [];
    if (txn.partner.territories) {
      try {
        partnerTerritories = typeof txn.partner.territories === 'string' 
          ? JSON.parse(txn.partner.territories) 
          : Array.isArray(txn.partner.territories) 
            ? txn.partner.territories 
            : [];
      } catch {
        // Si ce n'est pas du JSON, essayer comme string simple
        partnerTerritories = [txn.partner.territories];
      }
    }
    
    const territory = txn.user.territory || partnerTerritories[0] || 'Inconnu';
    
    // Filtrer par territoire si demandé
    if (filters.territory) {
      const matchesTerritory = territory === filters.territory || 
                               partnerTerritories.includes(filters.territory) ||
                               txn.user.territory === filters.territory;
      if (!matchesTerritory) {
        return; // Skip cette transaction
      }
    }
    
    const hour = new Date(txn.transactionDate).getHours();
    const timeSlot = filters.allDay ? null : getTimeSlotFromHour(hour);
    
    // Filtrer par timeSlot si demandé
    if (filters.timeSlot && !filters.allDay && timeSlot !== filters.timeSlot) {
      return; // Skip cette transaction
    }

    const key = `${territory}|${timeSlot || 'all-day'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        territory,
        timeSlot,
        transactions: []
      });
    }
    grouped.get(key)!.transactions.push(txn);
  });

  // Construire les lignes de statistiques
  const rows: StatisticsTableRowDTO[] = [];
  
  grouped.forEach((group, key) => {
    const count = new Set(group.transactions.map(t => t.userId)).size; // Nombre d'utilisateurs uniques
    const transactionsCount = group.transactions.length;
    const revenue = group.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const cashback = group.transactions.reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
    const averageTransaction = transactionsCount > 0 ? revenue / transactionsCount : 0;

    rows.push({
      territory: group.territory,
      ageRange: filters.ageRange || 'N/A', // Non disponible dans la DB
      gender: filters.gender || 'other', // Default to 'other' if not available in DB
      timeSlot: group.timeSlot,
      allDay: filters.allDay || false,
      count: Math.round(count),
      transactions: transactionsCount,
      revenue: Math.round(revenue * 100) / 100,
      cashback: Math.round(cashback * 100) / 100,
      averageTransaction: Math.round(averageTransaction * 100) / 100
    });
  });

  // Calculer les totaux
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const totalTransactions = rows.reduce((sum, r) => sum + r.transactions, 0);
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalCashback = rows.reduce((sum, r) => sum + r.cashback, 0);
  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const totals = {
    count: totalCount,
    transactions: totalTransactions,
    revenue: totalRevenue,
    cashback: totalCashback,
    averageTransaction
  };

  const result: StatisticsTableDTO = {
    rows,
    totals: {
      count: totals.count,
      transactions: totals.transactions,
      revenue: Math.round(totals.revenue * 100) / 100,
      cashback: Math.round(totals.cashback * 100) / 100,
      averageTransaction: Math.round(totals.averageTransaction * 100) / 100
    },
    filters: {
      territory: filters.territory || null,
      allDay: filters.allDay || false,
      timeSlot: filters.timeSlot || null,
      gender: filters.gender || null,
      ageRange: filters.ageRange || null
    }
  };

  logger.info({ rowsCount: rows.length, totals }, '📊 Statistiques table - résultat final');
  sendSuccess(res, result, null, 200, 'Statistiques de table récupérées avec succès');
});

/**
 * Helper pour obtenir le créneau horaire depuis une heure
 */
function getTimeSlotFromHour(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Helper pour obtenir l'heure depuis un créneau horaire
 */
function getHourFromTimeSlot(timeSlot: string): number | null {
  const map: Record<string, number> = {
    'morning': 9,
    'afternoon': 15,
    'evening': 20,
    'night': 23
  };
  return map[timeSlot] ?? null;
}

/**
 * GET /admin/statistics/departments
 * Retourne les statistiques par département
 */
export const getStatisticsDepartments = asyncHandler(async (req: Request, res: Response) => {
  const filters = departmentsFiltersSchema.parse(req.query);
  
  logger.info({ filters }, '📊 Statistiques départements - filtres reçus');

  // Récupérer tous les partenaires (on filtre par territoire côté application car territories est JSON)
  const partnerWhere: any = {};

  const partners = await prisma.partner.findMany({
    where: partnerWhere,
    select: {
      id: true,
      name: true,
      territories: true
    }
  });

  // Récupérer les transactions confirmées pour ces partenaires
  const partnerIds = partners.map(p => p.id);
  const transactions = await prisma.transaction.findMany({
    where: {
      status: 'confirmed',
      partnerId: partnerIds.length > 0 ? { in: partnerIds } : undefined
    },
    include: {
      partner: {
        select: {
          territories: true
        }
      }
    }
  });

  logger.info({ partnerCount: partners.length, transactionCount: transactions.length }, '📊 Statistiques départements - données trouvées');

  // Grouper par territoire/département
  const territoryMap = new Map<string, {
    territory: string;
    partners: Set<string>;
    transactions: typeof transactions;
  }>();

  partners.forEach(partner => {
    const territories = partner.territories ? JSON.parse(partner.territories) : [];
    territories.forEach((territory: string) => {
      if (filters.territory && territory !== filters.territory) return;
      
      const dept = getDepartmentByTerritory(territory);
      if (!territoryMap.has(territory)) {
        territoryMap.set(territory, {
          territory,
          partners: new Set(),
          transactions: []
        });
      }
      territoryMap.get(territory)!.partners.add(partner.id);
    });
  });

  transactions.forEach(txn => {
    const partnerTerritories = txn.partner.territories ? JSON.parse(txn.partner.territories) : [];
    partnerTerritories.forEach((territory: string) => {
      if (filters.territory && territory !== filters.territory) return;
      if (territoryMap.has(territory)) {
        territoryMap.get(territory)!.transactions.push(txn);
      }
    });
  });

  // Construire les résultats
  const results: DepartmentStatisticsDTO[] = [];

  territoryMap.forEach((data, territory) => {
    const dept = getDepartmentByTerritory(territory);
    const partnersCount = data.partners.size;
    const transactionsCount = data.transactions.length;
    const revenue = data.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const cashback = data.transactions.reduce((sum, t) => sum + (t.cashbackEarned || 0), 0);
    const averageTransaction = transactionsCount > 0 ? revenue / transactionsCount : 0;

    results.push({
      department: dept.name,
      code: dept.code,
      territory,
      partners: partnersCount,
      transactions: transactionsCount,
      revenue: Math.round(revenue * 100) / 100,
      averageTransaction: Math.round(averageTransaction * 100) / 100,
      cashback: Math.round(cashback * 100) / 100
    });
  });

  // Si aucun résultat, retourner structure vide pour chaque territoire
  if (results.length === 0) {
    const territories = filters.territory ? [filters.territory] : TERRITORIES;
    territories.forEach(territory => {
      const dept = getDepartmentByTerritory(territory);
      results.push({
        department: dept.name,
        code: dept.code,
        territory,
        partners: 0,
        transactions: 0,
        revenue: 0,
        averageTransaction: 0,
        cashback: 0
      });
    });
  }

  logger.info({ resultsCount: results.length }, '📊 Statistiques départements - résultat final');
  sendSuccess(res, results, null, 200, 'Statistiques par département récupérées avec succès');
});

/**
 * Retourne le département correspondant à un territoire
 */
function getDepartmentByTerritory(territory: string): { name: string; code: string } {
  const map: Record<string, { name: string; code: string }> = {
    'Martinique': { name: 'Martinique', code: '972' },
    'Guadeloupe': { name: 'Guadeloupe', code: '971' },
    'Guyane': { name: 'Guyane française', code: '973' }
  };
  return map[territory] || { name: territory, code: '000' };
}


