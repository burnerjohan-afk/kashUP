import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { fetchPartnerStatistics } from '../api';
import { formatCurrency } from '@/lib/utils/format';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

type PartnerStatisticsProps = {
  partnerId: string;
};

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

export const PartnerStatistics = ({ partnerId }: PartnerStatisticsProps) => {
  const statsQuery = useQuery({
    queryKey: ['partner-statistics', partnerId],
    queryFn: () => fetchPartnerStatistics(partnerId),
  });

  if (statsQuery.isLoading) {
    return <div className="p-6">Chargement des statistiques...</div>;
  }

  if (statsQuery.error || !statsQuery.data) {
    return <div className="p-6 text-red-500">Erreur lors du chargement des statistiques</div>;
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Transactions totales" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden min-h-[1.75rem] flex items-center justify-center leading-tight">
              {stats.totalTransactions.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-ink/50 mt-1.5">User → Partenaire</p>
          </div>
        </Card>
        <Card title="Montant total" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden min-h-[1.75rem] flex items-center justify-center leading-tight">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-ink/50 mt-1.5">Volume traité</p>
          </div>
        </Card>
        <Card title="Offres vendues" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden min-h-[1.75rem] flex items-center justify-center leading-tight">
              {stats.featuredOffersSold.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-ink/50 mt-1.5">Offres du moment</p>
          </div>
        </Card>
        <Card title="Utilisateurs actifs" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden min-h-[1.75rem] flex items-center justify-center leading-tight">
              {stats.activeUsers.toLocaleString('fr-FR')}
            </div>
            <p className="text-xs text-ink/50 mt-1.5">30 derniers jours</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Croissance des transactions" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[1.75rem]">
              {stats.transactionGrowth > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : stats.transactionGrowth < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : null}
              <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden leading-tight">
                {stats.transactionGrowth > 0 ? '+' : ''}
                {stats.transactionGrowth.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-ink/50 mt-1.5">vs période précédente</p>
          </div>
        </Card>
        <Card title="Croissance du panier moyen" className="text-center overflow-hidden !p-4">
          <div className="w-full max-w-full">
            <div className="flex items-center justify-center gap-1.5 flex-wrap min-h-[1.75rem]">
              {stats.averageBasketGrowth > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : stats.averageBasketGrowth < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500 flex-shrink-0" />
              ) : null}
              <div className="text-base sm:text-lg md:text-xl font-bold text-primary break-words overflow-hidden leading-tight">
                {stats.averageBasketGrowth > 0 ? '+' : ''}
                {stats.averageBasketGrowth.toFixed(1)}%
              </div>
            </div>
            <p className="text-xs text-ink/50 mt-1.5">vs période précédente</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Répartition par tranche d'âge">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.ageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.ageDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Répartition par sexe">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.genderDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.genderDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Transactions par jour de la semaine">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.dayDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="transactions" fill="#8B5CF6" name="Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Transactions par heure de la journée">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.hourDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="transactions" fill="#EC4899" name="Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Évolution des transactions (7 derniers jours)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.dailyEvolution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="transactions" fill="#10B981" name="Transactions" />
            <Bar dataKey="amount" fill="#F59E0B" name="Montant (€)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Évolution de la croissance des transactions (30 derniers jours)">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.transactionEvolution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="transactions"
              stroke="#8B5CF6"
              strokeWidth={2}
              name="Nombre de transactions"
            />
            <Line
              type="monotone"
              dataKey="growth"
              stroke="#10B981"
              strokeWidth={2}
              name="Croissance (%)"
              yAxisId="right"
            />
            <YAxis yAxisId="right" orientation="right" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Évolution du panier moyen et de sa croissance (30 derniers jours)">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.averageBasketEvolution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="averageBasket"
              stroke="#EC4899"
              strokeWidth={2}
              name="Panier moyen (€)"
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="growth"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Croissance (%)"
              yAxisId="right"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

