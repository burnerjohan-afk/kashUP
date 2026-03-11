import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Territory } from '@/types/entities';
import { fetchStatisticsTable, fetchDepartmentGlobalStats } from '../api';
import type { StatisticsTableData, StatisticsFilters } from '../api';
import { formatCurrency } from '@/lib/utils/format';
import { StatisticsDetailModal } from './statistics-detail-modal';

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeRow = (row: Partial<StatisticsTableData>): StatisticsTableData => ({
  period: typeof row.period === 'string' ? row.period : 'Période inconnue',
  transactions: toNumber(row.transactions, 0),
  transactionGrowth: toNumber(row.transactionGrowth, 0),
  averageBasket: toNumber(row.averageBasket, 0),
  averageBasketGrowth: toNumber(row.averageBasketGrowth, 0),
  totalAmount: toNumber(row.totalAmount, 0),
  isGlobal: row.isGlobal ?? false,
});

type StatisticsTableProps = {
  territory?: Territory | 'all';
};

export const StatisticsTable = ({ territory = 'all' }: StatisticsTableProps) => {
  const [filters, setFilters] = useState<StatisticsFilters>({
    territory: territory !== 'all' ? territory : 'all',
    sector: 'all',
    month: 'all',
    day: 'all',
    timeSlot: 'all',
    gender: 'all',
    ageRange: 'all',
  });
  const [selectedRow, setSelectedRow] = useState<StatisticsTableData | null>(null);

  // Synchroniser le filtre de territoire avec le prop
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      territory: territory !== 'all' ? territory : 'all',
    }));
  }, [territory]);

  const statsQuery = useQuery({
    queryKey: ['statistics-table', filters],
    queryFn: () => fetchStatisticsTable(filters),
  });

  const globalStatsQuery = useQuery({
    queryKey: ['department-global-stats'],
    queryFn: fetchDepartmentGlobalStats,
  });

  const columns: ColumnDef<StatisticsTableData>[] = [
    {
      header: 'Période',
      accessorKey: 'period',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <p className="text-sm text-ink">{row.original.period}</p>
          {row.original.isGlobal && (
            <Badge tone="primary" className="text-xs">Mondial</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Transactions',
      accessorKey: 'transactions',
      cell: ({ row }) => {
        const value = typeof row.original.transactions === 'number' ? row.original.transactions : 0;
        return <p className="text-sm text-ink">{value}</p>;
      },
    },
    {
      header: 'Évolution transactions',
      cell: ({ row }) => {
        const growthValue = typeof row.original.transactionGrowth === 'number' ? row.original.transactionGrowth : 0;
        const growth = Number.isFinite(growthValue) ? growthValue : 0;
        return (
          <div className="flex items-center gap-1">
            {growth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : growth < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span className="text-sm text-ink">
              {growth > 0 ? '+' : ''}
              {growth.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      header: 'Panier moyen',
      cell: ({ row }) => {
        const value = typeof row.original.averageBasket === 'number' ? row.original.averageBasket : 0;
        return <p className="text-sm text-ink">{formatCurrency(value)}</p>;
      },
    },
    {
      header: 'Évolution panier moyen',
      cell: ({ row }) => {
        const growthValue = typeof row.original.averageBasketGrowth === 'number' ? row.original.averageBasketGrowth : 0;
        const growth = Number.isFinite(growthValue) ? growthValue : 0;
        return (
          <div className="flex items-center gap-1">
            {growth > 0 ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : growth < 0 ? (
              <ArrowDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span className="text-sm text-ink">
              {growth > 0 ? '+' : ''}
              {growth.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      header: 'Montant total',
      cell: ({ row }) => {
        const value = typeof row.original.totalAmount === 'number' ? row.original.totalAmount : 0;
        return <p className="text-sm font-semibold text-ink">{formatCurrency(value)}</p>;
      },
    },
  ];

  return (
    <Card title="Statistiques détaillées" description="Analyse des transactions avec filtres avancés">
      <div className="mb-6 grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Select
          value={filters.territory}
          onChange={(e) => setFilters((prev) => ({ ...prev, territory: e.target.value as StatisticsFilters['territory'] }))}
        >
          <option value="all">Tous départements</option>
          <option value="martinique">Martinique</option>
          <option value="guadeloupe">Guadeloupe</option>
          <option value="guyane">Guyane</option>
        </Select>

        <Select
          value={filters.sector}
          onChange={(e) => setFilters((prev) => ({ ...prev, sector: e.target.value }))}
        >
          <option value="all">Tous secteurs</option>
          <option value="Restauration">Restauration</option>
          <option value="Beauté et Bien-être">Beauté et Bien-être</option>
          <option value="Loisir">Loisir</option>
          <option value="Retail">Retail</option>
          <option value="Mobilité">Mobilité</option>
          <option value="Culture">Culture</option>
          <option value="Sport">Sport</option>
          <option value="Mode">Mode</option>
          <option value="Électronique">Électronique</option>
          <option value="Services">Services</option>
        </Select>

        <Select
          value={filters.month}
          onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
        >
          <option value="all">Tous les mois</option>
          <option value="1">Janvier</option>
          <option value="2">Février</option>
          <option value="3">Mars</option>
          <option value="4">Avril</option>
          <option value="5">Mai</option>
          <option value="6">Juin</option>
          <option value="7">Juillet</option>
          <option value="8">Août</option>
          <option value="9">Septembre</option>
          <option value="10">Octobre</option>
          <option value="11">Novembre</option>
          <option value="12">Décembre</option>
        </Select>

        <Select
          value={filters.day}
          onChange={(e) => setFilters((prev) => ({ ...prev, day: e.target.value }))}
        >
          <option value="all">Tous les jours</option>
          <option value="0">Dimanche</option>
          <option value="1">Lundi</option>
          <option value="2">Mardi</option>
          <option value="3">Mercredi</option>
          <option value="4">Jeudi</option>
          <option value="5">Vendredi</option>
          <option value="6">Samedi</option>
        </Select>

        <Select
          value={filters.timeSlot}
          onChange={(e) => setFilters((prev) => ({ ...prev, timeSlot: e.target.value }))}
        >
          <option value="all">Toutes heures</option>
          <option value="00-06">00h - 06h</option>
          <option value="06-09">06h - 09h</option>
          <option value="09-12">09h - 12h</option>
          <option value="12-15">12h - 15h</option>
          <option value="15-18">15h - 18h</option>
          <option value="18-21">18h - 21h</option>
          <option value="21-24">21h - 24h</option>
        </Select>

        <Select
          value={filters.gender}
          onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))}
        >
          <option value="all">Tous genres</option>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
        </Select>

        <Select
          value={filters.ageRange}
          onChange={(e) => setFilters((prev) => ({ ...prev, ageRange: e.target.value }))}
        >
          <option value="all">Toutes tranches</option>
          <option value="18-25">18-25 ans</option>
          <option value="26-35">26-35 ans</option>
          <option value="36-45">36-45 ans</option>
          <option value="46-55">46-55 ans</option>
          <option value="56+">56+ ans</option>
        </Select>
      </div>

      {statsQuery.isLoading || (filters.territory !== 'all' && globalStatsQuery.isLoading) ? (
        <div className="p-6 text-center text-ink/50">Chargement...</div>
      ) : (
        // Note: Les erreurs sont gérées dans fetchStatisticsTable() et fetchDepartmentGlobalStats()
        // qui retournent des tableaux vides en cas d'erreur, donc on affiche toujours la table
        // même si elle est vide (pas de message d'erreur bloquant)
        (() => {
          const globalRows =
            filters.territory !== 'all' && globalStatsQuery.data && globalStatsQuery.data.length > 0
              ? globalStatsQuery.data
                  .filter((dept) => dept.territory === filters.territory)
                  .map((dept) =>
                    normalizeRow({
                      period: `Statistiques mondiales - ${dept.territory}`,
                      transactions: dept.transactions,
                      transactionGrowth: dept.transactionGrowth,
                      averageBasket: dept.averageBasket,
                      averageBasketGrowth: dept.averageBasketGrowth,
                      totalAmount: dept.totalAmount,
                      isGlobal: true,
                    }),
                  )
              : [];

          const statsRows = (statsQuery.data ?? []).map((row) => normalizeRow(row));

          const allRows = [...globalRows, ...statsRows];

          if (import.meta.env.DEV) {
            console.log('📊 Lignes statistiques normalisées:', {
              globalRowsCount: globalRows.length,
              statsRowsCount: statsRows.length,
              totalRows: allRows.length,
              sample: allRows.slice(0, 2),
            });
          }

          return (
            <DataTable
              columns={columns}
              data={allRows}
              emptyState="Aucune transaction sur la période"
              onRowClick={(row) => setSelectedRow(row.original)}
            />
          );
        })()
      )}

      {selectedRow && (
        <StatisticsDetailModal
          data={selectedRow}
          filters={filters as Record<string, string>}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </Card>
  );
};

