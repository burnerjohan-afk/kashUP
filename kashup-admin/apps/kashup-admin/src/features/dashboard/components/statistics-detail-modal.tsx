import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { fetchStatisticsDetail } from '../api';
import type { StatisticsTableData, StatisticsDetailData } from '../api';
import { formatCurrency } from '@/lib/utils/format';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toArray = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const normalizeComparison = (items: unknown) =>
  toArray(items).map((item) => ({
    period: typeof (item as any)?.period === 'string' ? (item as any).period : 'Période inconnue',
    transactions: toNumber((item as any)?.transactions),
    averageBasket: toNumber((item as any)?.averageBasket),
    totalAmount: toNumber((item as any)?.totalAmount),
  }));

const normalizeMonthlyEvolution = (items: unknown) =>
  toArray(items).map((item) => ({
    month: typeof (item as any)?.month === 'string' ? (item as any).month : '',
    transactions: toNumber((item as any)?.transactions),
    averageBasket: toNumber((item as any)?.averageBasket),
  }));

const normalizeEvolution = (evo: any) => ({
  previous: {
    transactions: toNumber(evo?.previous?.transactions),
    averageBasket: toNumber(evo?.previous?.averageBasket),
    totalAmount: toNumber(evo?.previous?.totalAmount),
  },
  transactionGrowth: toNumber(evo?.transactionGrowth),
  averageBasketGrowth: toNumber(evo?.averageBasketGrowth),
  totalAmountGrowth: toNumber(evo?.totalAmountGrowth),
});

const normalizeCurrent = (current: any) => ({
  transactions: toNumber(current?.transactions),
  averageBasket: toNumber(current?.averageBasket),
  totalAmount: toNumber(current?.totalAmount),
});

type StatisticsDetailModalProps = {
  data: StatisticsTableData;
  filters: Record<string, string>;
  onClose: () => void;
};

export const StatisticsDetailModal = ({ data, filters, onClose }: StatisticsDetailModalProps) => {
  const detailQuery = useQuery({
    queryKey: ['statistics-detail', data, filters],
    queryFn: () => fetchStatisticsDetail(data, filters),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center text-ink/50">Chargement des détails...</div>
        </Card>
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center text-red-500">Erreur lors du chargement</div>
          <Button onClick={onClose} className="mt-4">Fermer</Button>
        </Card>
      </div>
    );
  }

  const detail = detailQuery.data || {};
  const current = normalizeCurrent(detail.current);
  const evolutionM1 = normalizeEvolution(detail.evolutionM1 || {});
  const evolutionN1 = normalizeEvolution(detail.evolutionN1 || {});

  const monthlyEvolution = normalizeMonthlyEvolution(detail.monthlyEvolution);
  const comparison = normalizeComparison(detail.comparison);

  const growthTxM1 = evolutionM1.transactionGrowth;
  const growthTxN1 = evolutionN1.transactionGrowth;
  const growthAvgM1 = evolutionM1.averageBasketGrowth;
  const growthAvgN1 = evolutionN1.averageBasketGrowth;
  const growthTotM1 = evolutionM1.totalAmountGrowth;
  const growthTotN1 = evolutionN1.totalAmountGrowth;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">{data.period}</h2>
            <p className="text-sm text-ink/50">Statistiques détaillées</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Transactions" className="text-center">
              <div className="text-3xl font-bold text-primary">{current.transactions}</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {growthTxM1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthTxM1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs M-1: {growthTxM1 > 0 ? '+' : ''}
                  {growthTxM1.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                {growthTxN1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthTxN1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs N-1: {growthTxN1 > 0 ? '+' : ''}
                  {growthTxN1.toFixed(1)}%
                </span>
              </div>
            </Card>

            <Card title="Panier moyen" className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(current.averageBasket)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {growthAvgM1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthAvgM1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs M-1: {growthAvgM1 > 0 ? '+' : ''}
                  {growthAvgM1.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                {growthAvgN1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthAvgN1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs N-1: {growthAvgN1 > 0 ? '+' : ''}
                  {growthAvgN1.toFixed(1)}%
                </span>
              </div>
            </Card>

            <Card title="Montant total" className="text-center">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(detail.current.totalAmount)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                {growthTotM1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthTotM1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs M-1: {growthTotM1 > 0 ? '+' : ''}
                  {growthTotM1.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2">
                {growthTotN1 > 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : growthTotN1 < 0 ? (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className="text-sm text-ink/70">
                  vs N-1: {growthTotN1 > 0 ? '+' : ''}
                  {growthTotN1.toFixed(1)}%
                </span>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Évolution mensuelle (12 derniers mois)">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Transactions"
                  />
                  <Line
                    type="monotone"
                    dataKey="averageBasket"
                    stroke="#EC4899"
                    strokeWidth={2}
                    name="Panier moyen (€)"
                    yAxisId="right"
                  />
                  <YAxis yAxisId="right" orientation="right" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Comparaison M-1 vs N-1">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="transactions" fill="#8B5CF6" name="Transactions" />
                  <Bar dataKey="averageBasket" fill="#EC4899" name="Panier moyen (€)" />
                  <Bar dataKey="totalAmount" fill="#10B981" name="Montant total (€)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card title="Détails des évolutions">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-ink/10 p-4">
                <h4 className="mb-3 text-sm font-semibold text-primary">Comparaison M-1 (Mois précédent)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/70">Transactions:</span>
                    <span className="font-semibold text-ink">
                      {detail.evolutionM1.previous.transactions} → {detail.current.transactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/70">Panier moyen:</span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(detail.evolutionM1.previous.averageBasket)} →{' '}
                      {formatCurrency(current.averageBasket)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/70">Montant total:</span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(detail.evolutionM1.previous.totalAmount)} →{' '}
                {formatCurrency(current.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-ink/10 p-4">
                <h4 className="mb-3 text-sm font-semibold text-primary">Comparaison N-1 (Année précédente)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/70">Transactions:</span>
                    <span className="font-semibold text-ink">
                      {detail.evolutionN1.previous.transactions} → {detail.current.transactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/70">Panier moyen:</span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(detail.evolutionN1.previous.averageBasket)} →{' '}
                      {formatCurrency(detail.current.averageBasket)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/70">Montant total:</span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(detail.evolutionN1.previous.totalAmount)} →{' '}
                      {formatCurrency(current.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

