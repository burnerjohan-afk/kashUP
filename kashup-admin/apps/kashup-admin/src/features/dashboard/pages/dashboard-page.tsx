import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import type { Territory } from '@/types/entities';
import { fetchDashboardSummary, fetchImpactStats } from '../api';
import { KpiGrid } from '../components/kpi-grid';
import { TransactionsChart } from '../components/transactions-chart';
import { TerritoryBreakdownChart } from '../components/territory-breakdown';
import { RecentWebhooks } from '../components/recent-webhooks';
import { SystemStatus } from '../components/system-status';
import { StatisticsTable } from '../components/statistics-table';
import { DashboardTabs } from '../components/dashboard-tabs';
import { AIAnalysis } from '../components/ai-analysis';

/**
 * Page principale du dashboard admin
 * 
 * ENDPOINTS UTILISÉS:
 * - GET /admin/dashboard → fetchDashboardSummary()
 * - GET /stats/impact-local → fetchImpactStats()
 * - GET /admin/statistics/table → fetchStatisticsTable()
 * - GET /admin/statistics/departments → fetchDepartmentGlobalStats()
 * - GET /admin/ai/analysis → fetchAIAnalysis()
 * 
 * GESTION DES ERREURS:
 * - Les endpoints de statistiques gèrent automatiquement les erreurs 404/400/500
 *   en retournant des valeurs par défaut (tableaux vides, structures vides)
 * - Cela évite les crashes de l'interface si certains endpoints ne sont pas encore implémentés
 */
export const DashboardPage = () => {
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | 'all'>('all');

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', selectedTerritory],
    queryFn: async () => {
      try {
        const result = await fetchDashboardSummary(selectedTerritory);
        // S'assurer que toutes les propriétés sont présentes et valides
        return {
          kpis: result?.kpis || {
            cashbackVolume: 0,
            pointsInjected: 0,
            activeUsers: 0,
            activePartners: 0,
          },
          dailyTransactions: Array.isArray(result?.dailyTransactions) ? result.dailyTransactions : [],
          territories: Array.isArray(result?.territories) ? result.territories : [],
          recentWebhooks: Array.isArray(result?.recentWebhooks) ? result.recentWebhooks : [],
          services: Array.isArray(result?.services) ? result.services : [],
          servicesCount: typeof result?.servicesCount === 'number' ? result.servicesCount : 0,
          totals: result?.totals || {
            totalUsers: 0,
            totalTransactions: 0,
            totalVolume: 0,
            totalCashback: 0,
            totalPoints: 0,
            totalDonations: 0,
          },
        };
      } catch (error) {
        // Encapsuler toute erreur non gérée
        if (import.meta.env.DEV) {
          console.error('❌ Erreur dans fetchDashboardSummary:', error);
        }
        // Retourner des valeurs par défaut pour éviter les crashes
        return {
          kpis: {
            cashbackVolume: 0,
            pointsInjected: 0,
            activeUsers: 0,
            activePartners: 0,
          },
          dailyTransactions: [],
          territories: [],
          recentWebhooks: [],
          services: [],
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
      }
    },
    refetchInterval: 60_000,
  });

  const impactQuery = useQuery({
    queryKey: ['impact', selectedTerritory],
    queryFn: async () => {
      try {
        const result = await fetchImpactStats(selectedTerritory);
        // S'assurer que le résultat est un tableau valide
        return Array.isArray(result) ? result : [];
      } catch (error) {
        // Encapsuler toute erreur non gérée
        if (import.meta.env.DEV) {
          console.error('❌ Erreur dans fetchImpactStats:', error);
        }
        // Retourner un tableau vide
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!dashboardQuery.data) {
    return <p className="text-sm text-warning">Impossible de charger le dashboard.</p>;
  }

  const { kpis, dailyTransactions, territories, recentWebhooks, services, servicesCount } = dashboardQuery.data;

  // Vérifier que kpis existe et a les propriétés nécessaires
  // Si kpis n'existe pas, utiliser des valeurs par défaut
  // ⚠️ IMPORTANT: Déclarer safeKpis AVANT le useEffect qui l'utilise
  const safeKpis = kpis && typeof kpis === 'object' ? kpis : {
    cashbackVolume: 0,
    pointsInjected: 0,
    activeUsers: 0,
    activePartners: 0,
  };

  // Vérifier et transformer les données pour éviter les erreurs de rendu
  const safeRecentWebhooks = Array.isArray(recentWebhooks) ? recentWebhooks : [];
  const safeServices = Array.isArray(services) ? services : [];
  const safeTerritories = Array.isArray(territories) ? territories : [];
  const safeDailyTransactions = Array.isArray(dailyTransactions) ? dailyTransactions : [];

  // Log pour déboguer les structures de données (uniquement en développement)
  if (import.meta.env.DEV) {
    console.log('📊 Structure des données du dashboard:', {
      kpis: safeKpis,
      services: safeServices.length,
      servicesCount,
      recentWebhooks: safeRecentWebhooks.length,
      territories: safeTerritories.length,
      dailyTransactions: safeDailyTransactions.length,
    });
  }

  // Afficher un avertissement si les données sont incomplètes (mais continuer à afficher)
  const hasIncompleteData = !kpis || typeof kpis !== 'object';

  return (
    <div className="min-w-0 space-y-8">
      {hasIncompleteData && import.meta.env.DEV && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-4">
          <p className="text-sm text-warning font-medium mb-2">
            ⚠️ Données incomplètes détectées
          </p>
          <p className="text-xs text-ink/70 mb-2">
            L'API backend retourne un format différent. Les données ont été transformées automatiquement.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer text-ink/60 hover:text-ink/80">
              Voir les données brutes
            </summary>
            <pre className="mt-2 bg-ink/5 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(dashboardQuery.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
      <DashboardTabs selectedTerritory={selectedTerritory} onTerritoryChange={setSelectedTerritory}>
        <KpiGrid kpis={safeKpis} impact={impactQuery.data} />
        <div className={selectedTerritory === 'all' ? 'grid gap-6 lg:grid-cols-2' : 'grid gap-6'}>
          <TransactionsChart data={safeDailyTransactions} isLoading={dashboardQuery.isLoading} />
          {selectedTerritory === 'all' && (
            <TerritoryBreakdownChart data={safeTerritories} isLoading={dashboardQuery.isLoading} />
          )}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentWebhooks events={safeRecentWebhooks} />
          <SystemStatus services={safeServices} servicesCount={servicesCount} />
        </div>
        <StatisticsTable territory={selectedTerritory} />
      </DashboardTabs>
      <AIAnalysis territory={selectedTerritory} />
    </div>
  );
};

