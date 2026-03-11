import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchUserStatistics } from '../api';
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

type UserStatisticsProps = {
  userId: string;
};

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4'];

export const UserStatistics = ({ userId }: UserStatisticsProps) => {
  const statsQuery = useQuery({
    queryKey: ['user-statistics', userId],
    queryFn: () => fetchUserStatistics(userId),
  });

  if (statsQuery.isLoading) {
    return <div className="p-6">Chargement des statistiques...</div>;
  }

  if (statsQuery.error || !statsQuery.data) {
    return <div className="p-6 text-red-500">Erreur lors du chargement des statistiques</div>;
  }

  const stats = statsQuery.data;

  // Trouver les secteurs privilégiés (top 3)
  const topSectors = [...stats.sectorDistribution]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((s) => s.name);

  // Trouver le jour favori
  const favoriteDay = stats.dayDistribution.reduce((max, day) =>
    day.transactions > max.transactions ? day : max,
  );

  // Trouver l'heure favorite
  const favoriteHour = stats.hourDistribution.reduce((max, hour) =>
    hour.transactions > max.transactions ? hour : max,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Transactions totales" className="text-center">
          <div className="text-3xl font-bold text-primary">{stats.totalTransactions}</div>
          <p className="text-sm text-ink/50 mt-2">Toutes transactions</p>
        </Card>
        <Card title="Panier moyen" className="text-center">
          <div className="text-3xl font-bold text-primary">{formatCurrency(stats.averageBasket)}</div>
          <p className="text-sm text-ink/50 mt-2">Par transaction</p>
        </Card>
        <Card title="Montant total" className="text-center">
          <div className="text-3xl font-bold text-primary">{formatCurrency(stats.totalAmount)}</div>
          <p className="text-sm text-ink/50 mt-2">Volume total</p>
        </Card>
        <Card title="Partenaires différents" className="text-center">
          <div className="text-3xl font-bold text-primary">{stats.uniquePartners}</div>
          <p className="text-sm text-ink/50 mt-2">Partenaire visités</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Évolution des transactions (30 derniers jours)">
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
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Évolution du panier moyen (30 derniers jours)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.averageBasketEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="averageBasket"
                stroke="#EC4899"
                strokeWidth={2}
                name="Panier moyen (€)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Répartition par secteur d'activité">
        <div className="mb-4">
          <p className="text-sm text-ink/70 mb-2">Secteurs privilégiés :</p>
          <div className="flex gap-2 flex-wrap">
            {topSectors.map((sector) => (
              <Badge key={sector} tone="primary">
                {sector}
              </Badge>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.sectorDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="value"
              fill="#8B5CF6"
              name="Transactions"
              radius={[8, 8, 0, 0]}
            >
              {stats.sectorDistribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={topSectors.includes(entry.name) ? '#10B981' : '#8B5CF6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Transactions par jour de la semaine">
          <div className="mb-4">
            <p className="text-sm text-ink/70 mb-2">Jour favori :</p>
            <Badge tone="primary">{favoriteDay.day}</Badge>
            <span className="ml-2 text-sm text-ink/60">
              ({favoriteDay.transactions} transactions)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dayDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="transactions" fill="#8B5CF6" name="Transactions" radius={[8, 8, 0, 0]}>
                {stats.dayDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.day === favoriteDay.day ? '#10B981' : '#8B5CF6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Transactions par heure de la journée">
          <div className="mb-4">
            <p className="text-sm text-ink/70 mb-2">Heure favorite :</p>
            <Badge tone="primary">{favoriteHour.hour}</Badge>
            <span className="ml-2 text-sm text-ink/60">
              ({favoriteHour.transactions} transactions)
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.hourDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="transactions" fill="#EC4899" name="Transactions" radius={[8, 8, 0, 0]}>
                {stats.hourDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.hour === favoriteHour.hour ? '#10B981' : '#EC4899'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

