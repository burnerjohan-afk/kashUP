import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { DailyTransactionPoint } from '../api';
import { formatCurrency } from '@/lib/utils/format';

type TransactionsChartProps = {
  data: DailyTransactionPoint[];
  isLoading?: boolean;
};

const tooltipFormatter = (value: number, name: string) => {
  if (name === 'Transactions') {
    return [value, name];
  }
  return [formatCurrency(value), name];
};

export const TransactionsChart = ({ data, isLoading }: TransactionsChartProps) => {
  const safeData = Array.isArray(data) ? data : [];
  const isEmpty = safeData.length === 0;

  return (
    <Card title="Transactions quotidiennes" description="Cashback vs points sur 14 jours">
      <div className="h-80">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-xl bg-ink/5" />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center text-sm text-ink/50">
            Aucune transaction sur la période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => `${value}`}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value / 1000}k€`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar
                yAxisId="right"
                dataKey="cashbackVolume"
                stackId="a"
                fill="#4B2AAD"
                name="Cashback"
              />
              <Bar
                yAxisId="right"
                dataKey="pointsVolume"
                stackId="a"
                fill="#7E5BFF"
                name="Points"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="transactions"
                stroke="#24C38B"
                strokeWidth={2}
                name="Transactions"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

