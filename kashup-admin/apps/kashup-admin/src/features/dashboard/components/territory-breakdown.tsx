import { useState, useEffect, useRef } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import type { TerritoryBreakdown } from '../api';
import { formatCurrency } from '@/lib/utils/format';

type TerritoryBreakdownProps = {
  data: TerritoryBreakdown[];
  isLoading?: boolean;
};

export const TerritoryBreakdownChart = ({ data, isLoading }: TerritoryBreakdownProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Observer les dimensions du container
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };

    // Initialiser les dimensions
    updateDimensions();

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Transformer les données pour s'assurer que territory est une string
  const transformedData = (data || [])
    .filter((item) => item && (item.territory || item.transactions !== undefined || item.cashbackVolume !== undefined)) // Filtrer les items invalides
    .map((item, index) => {
      const territory = typeof item.territory === 'string' 
        ? item.territory 
        : (item.territory as { id?: string; name?: string })?.name || `Territoire ${index + 1}`;
      
      return {
        ...item,
        territory,
      };
    });

  const hasValidDimensions = dimensions.width > 0 && dimensions.height > 0;
  const hasData = transformedData.length > 0;

  // Ne pas rendre le chart si les dimensions ne sont pas valides
  const canRenderChart = hasValidDimensions && hasData && !isLoading;

  return (
    <Card title="Répartition par territoire" description="Transactions vs volume cashback">
      <div ref={containerRef} className="h-80 min-h-[320px] w-full">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-xl bg-ink/5" />
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-ink/50">Aucune donnée de territoire disponible</p>
          </div>
        ) : !hasValidDimensions ? (
          <div className="h-full animate-pulse rounded-xl bg-ink/5" />
        ) : canRenderChart ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transformedData} width={dimensions.width} height={dimensions.height}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="territory" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `${value / 1000}k€`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === 'cashbackVolume' ? formatCurrency(value as number) : value
              }
              labelFormatter={(label) => `Territoire ${label}`}
            />
            <Bar
              yAxisId="left"
              dataKey="transactions"
              fill="#24C38B"
              name="Transactions"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              yAxisId="right"
              dataKey="cashbackVolume"
              fill="#4B2AAD"
              name="Cashback"
              radius={[8, 8, 0, 0]}
            />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </Card>
  );
};

