/**
 * API Admin - Endpoints pour les statistiques et analyses du back-office
 * 
 * Ce fichier centralise tous les appels API liés aux fonctionnalités admin :
 * - Statistiques détaillées avec filtres avancés
 * - Statistiques par département
 * - Analyse IA des données
 */

import { getJson, getStandardJson } from '@/lib/api/client';
import { unwrapResponse, unwrapStandardResponse } from '@/lib/api/response';
import type { Territory } from '@/types/entities';

// ============================================================================
// TYPES POUR GET /admin/statistics/table
// ============================================================================

/**
 * Filtres disponibles pour la table de statistiques
 */
export type StatisticsTableFilters = {
  /** Territoire à filtrer ('all' pour tous les départements) */
  territory?: Territory | 'all';
  /** Secteur d'activité à filtrer ('all' pour tous les secteurs) */
  sector?: string;
  /** Mois à filtrer (1-12, 'all' pour tous les mois) */
  month?: string;
  /** Jour de la semaine à filtrer (0-6, 'all' pour tous les jours) */
  day?: string;
  /** Créneau horaire à filtrer ('all' pour toutes les heures) */
  timeSlot?: string;
  /** Genre à filtrer ('all', 'male', 'female') */
  gender?: string;
  /** Tranche d'âge à filtrer ('all', '18-25', '26-35', '36-45', '46-55', '56+') */
  ageRange?: string;
};

/**
 * Données d'une ligne de la table de statistiques
 * 
 * Chaque ligne représente les statistiques pour une période/filtre donné
 */
export type StatisticsTableRow = {
  /** Libellé de la période (ex: "Janvier", "Lundi", "18h-21h", "Période actuelle") */
  period: string;
  /** Nombre total de transactions */
  transactions: number;
  /** Pourcentage d'évolution des transactions (peut être négatif) */
  transactionGrowth: number;
  /** Panier moyen en euros */
  averageBasket: number;
  /** Pourcentage d'évolution du panier moyen (peut être négatif) */
  averageBasketGrowth: number;
  /** Montant total en euros (transactions × panier moyen) */
  totalAmount: number;
  /** Indique si c'est une statistique globale (optionnel) */
  isGlobal?: boolean;
};

/**
 * Récupère les statistiques détaillées avec filtres avancés
 * 
 * @param filters - Filtres à appliquer (territory, sector, month, day, timeSlot, gender, ageRange)
 * @returns Tableau de lignes de statistiques correspondant aux filtres
 * 
 * @example
 * ```typescript
 * const stats = await getStatisticsTable({
 *   territory: 'martinique',
 *   sector: 'Restauration',
 *   month: '12'
 * });
 * ```
 * 
 * ENDPOINT: GET /admin/statistics/table
 * 
 * QUERY PARAMS:
 * - territory?: 'martinique' | 'guadeloupe' | 'guyane' | 'all'
 * - sector?: string (ex: 'Restauration', 'Retail', 'Culture', 'Mobilité')
 * - month?: string (1-12 ou 'all')
 * - day?: string (0-6 ou 'all', où 0=Dimanche, 6=Samedi)
 * - timeSlot?: string (ex: '00-06', '06-09', '09-12', '12-15', '15-18', '18-21', '21-24' ou 'all')
 * - gender?: 'male' | 'female' | 'all'
 * - ageRange?: '18-25' | '26-35' | '36-45' | '46-55' | '56+' | 'all'
 * 
 * RÉPONSE ATTENDUE:
 * Array<{
 *   period: string;              // Libellé de la période
 *   transactions: number;        // Nombre de transactions
 *   transactionGrowth: number;  // % d'évolution (ex: 12.5 pour +12.5%)
 *   averageBasket: number;       // Panier moyen en euros (ex: 45.8)
 *   averageBasketGrowth: number; // % d'évolution (ex: 8.3 pour +8.3%)
 *   totalAmount: number;         // Montant total en euros
 * }>
 */
export const getStatisticsTable = async (
  filters: StatisticsTableFilters = {}
): Promise<StatisticsTableRow[]> => {
  try {
    // Utiliser le nouveau format StandardResponse
    const response = await getStandardJson<{ rows: StatisticsTableRow[]; totals?: any; filters?: any }>('admin/statistics/table', filters);
    const data = unwrapStandardResponse(response);
    
    let rows: StatisticsTableRow[] = [];
    
    // Le nouveau format retourne { rows, totals, filters }
    if (data && typeof data === 'object' && 'rows' in data) {
      rows = Array.isArray(data.rows) ? data.rows : [];
    } else if (Array.isArray(data)) {
      // Fallback: si c'est directement un array (ancien format)
      rows = data;
    }
    
    // Normaliser et filtrer les lignes invalides
    const normalizedRows = rows
      .filter((row) => row != null && typeof row === 'object')
      .map((row) => ({
        period: typeof row.period === 'string' && row.period.trim() ? row.period : 'Période inconnue',
        transactions: typeof row.transactions === 'number' && Number.isFinite(row.transactions) ? row.transactions : 0,
        transactionGrowth: typeof row.transactionGrowth === 'number' && Number.isFinite(row.transactionGrowth) ? row.transactionGrowth : 0,
        averageBasket: typeof row.averageBasket === 'number' && Number.isFinite(row.averageBasket) ? row.averageBasket : 0,
        averageBasketGrowth: typeof row.averageBasketGrowth === 'number' && Number.isFinite(row.averageBasketGrowth) ? row.averageBasketGrowth : 0,
        totalAmount: typeof row.totalAmount === 'number' && Number.isFinite(row.totalAmount) ? row.totalAmount : 0,
        isGlobal: row.isGlobal ?? false,
      }));
    
    if (import.meta.env.DEV) {
      console.log('📊 Statistiques table reçues:', {
        rowsCount: normalizedRows.length,
        sample: normalizedRows.slice(0, 2),
        filters,
      });
    }
    
    return normalizedRows;
  } catch (error) {
    // En cas d'erreur, retourner un tableau vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération des statistiques (table):', error);
    }
    return [];
  }
};

// ============================================================================
// TYPES POUR GET /admin/statistics/departments
// ============================================================================

/**
 * Statistiques globales par département
 * 
 * Représente les statistiques agrégées pour un territoire donné
 */
export type DepartmentStatistics = {
  /** Territoire concerné */
  territory: Territory;
  /** Nombre total de transactions */
  transactions: number;
  /** Pourcentage d'évolution des transactions (peut être négatif) */
  transactionGrowth: number;
  /** Panier moyen en euros */
  averageBasket: number;
  /** Pourcentage d'évolution du panier moyen (peut être négatif) */
  averageBasketGrowth: number;
  /** Montant total en euros */
  totalAmount: number;
};

/**
 * Récupère les statistiques globales pour tous les départements
 * 
 * @returns Tableau des statistiques par département (Martinique, Guadeloupe, Guyane)
 * 
 * @example
 * ```typescript
 * const departments = await getStatisticsDepartments();
 * // Retourne: [
 * //   { territory: 'martinique', transactions: 1247, ... },
 * //   { territory: 'guadeloupe', transactions: 892, ... },
 * //   { territory: 'guyane', transactions: 654, ... }
 * // ]
 * ```
 * 
 * ENDPOINT: GET /admin/statistics/departments
 * 
 * QUERY PARAMS: Aucun
 * 
 * RÉPONSE ATTENDUE:
 * Array<{
 *   territory: 'martinique' | 'guadeloupe' | 'guyane';
 *   transactions: number;        // Nombre total de transactions
 *   transactionGrowth: number;  // % d'évolution (ex: 12.5 pour +12.5%, -5.2 pour -5.2%)
 *   averageBasket: number;       // Panier moyen en euros (ex: 45.8)
 *   averageBasketGrowth: number; // % d'évolution (ex: 8.3 pour +8.3%, -2.1 pour -2.1%)
 *   totalAmount: number;         // Montant total en euros
 * }>
 * 
 * NOTE: L'API doit retourner un tableau avec exactement 3 éléments (un par territoire)
 */
export const getStatisticsDepartments = async (territory?: string): Promise<DepartmentStatistics[]> => {
  try {
    const searchParams = territory && territory !== 'all' ? { territory } : undefined;
    const response = await getStandardJson<DepartmentStatistics[]>('admin/statistics/departments', searchParams);
    const data = unwrapStandardResponse(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // En cas d'erreur, retourner un tableau vide
    if (import.meta.env.DEV) {
      console.warn('⚠️ Erreur lors de la récupération des statistiques (departments):', error);
    }
    return [];
  }
};

// ============================================================================
// TYPES POUR GET /admin/ai/analysis
// ============================================================================

/**
 * Type d'action recommandée par l'IA
 */
export type ActionPlanType = 'boost' | 'lottery' | 'challenge' | 'other';

/**
 * Action recommandée dans le plan d'action
 */
export type ActionPlanItem = {
  /** Type d'action recommandée */
  type: ActionPlanType;
  /** Titre de l'action */
  title: string;
  /** Description détaillée de l'action */
  description: string;
  /** Impact attendu (optionnel) */
  expectedImpact?: string;
};

/**
 * Analyse complète générée par l'IA
 */
export type AIAnalysis = {
  /** Résumé général des statistiques analysées */
  summary: string;
  /** Analyse détaillée des évolutions (comparaisons M-1, N-1, tendances) */
  evolutionAnalysis: string;
  /** Plan d'action avec recommandations concrètes */
  actionPlan: ActionPlanItem[];
};

/**
 * Récupère l'analyse IA des statistiques pour un territoire donné
 * 
 * @param territory - Territoire à analyser ('all' pour tous les départements)
 * @returns Analyse complète avec résumé, analyse des évolutions et plan d'action
 * 
 * @example
 * ```typescript
 * const analysis = await getAiAnalysis('martinique');
 * console.log(analysis.summary); // "Analyse des statistiques pour martinique:..."
 * console.log(analysis.actionPlan); // [{ type: 'boost', title: '...', ... }]
 * ```
 * 
 * ENDPOINT: GET /admin/ai/analysis
 * 
 * QUERY PARAMS:
 * - territory?: 'martinique' | 'guadeloupe' | 'guyane' | 'all' (défaut: 'all')
 * 
 * RÉPONSE ATTENDUE:
 * {
 *   summary: string;              // Texte de résumé (peut contenir des \n)
 *   evolutionAnalysis: string;    // Texte d'analyse des évolutions (peut contenir des \n)
 *   actionPlan: Array<{
 *     type: 'boost' | 'lottery' | 'challenge' | 'other';
 *     title: string;              // Titre de l'action (ex: "Boost week-end spécial")
 *     description: string;        // Description détaillée
 *     expectedImpact?: string;    // Impact attendu (ex: "Augmentation estimée de 15-20%")
 *   }>
 * }
 * 
 * NOTE: 
 * - Les champs `summary` et `evolutionAnalysis` sont des chaînes de caractères
 *   qui peuvent contenir des retours à la ligne (\n) pour le formatage
 * - Le plan d'action contient généralement 3-5 recommandations
 * - L'analyse est générée dynamiquement en fonction des statistiques du territoire
 */
export const getAiAnalysis = async (
  territory: Territory | 'all' = 'all'
): Promise<AIAnalysis> => {
  try {
    const searchParams = territory && territory !== 'all' ? { territory } : undefined;
    const response = await getStandardJson<AIAnalysis>('admin/ai/analysis', searchParams);
    return unwrapStandardResponse(response);
  } catch (error) {
    // En cas d'erreur, retourner une analyse vide
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

