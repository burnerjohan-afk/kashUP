import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import {
  fetchMonitoringHealth,
  fetchMonitoringMetrics,
  fetchWebhooksConsole,
  sendTestWebhook,
  type MonitoringMetric,
} from '../api';

export const WebhooksPage = () => {
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const consoleQuery = useQuery({
    queryKey: ['webhooks-console', sourceFilter],
    queryFn: () => fetchWebhooksConsole(sourceFilter === 'all' ? undefined : sourceFilter),
    refetchInterval: 15_000,
  });

  const healthQuery = useQuery({
    queryKey: ['monitoring-health'],
    queryFn: fetchMonitoringHealth,
    refetchInterval: 60_000,
  });

  const metricsQuery = useQuery({
    queryKey: ['monitoring-metrics'],
    queryFn: fetchMonitoringMetrics,
    refetchInterval: 20_000,
  });

  const alertCache = useRef(new Set<string>());

  useEffect(() => {
    if (!metricsQuery.data) return;
    metricsQuery.data.forEach((metric) => {
      const key = metric.name;
      if (metric.value > metric.threshold && !alertCache.current.has(key)) {
        toast.warning(`${metric.name} dépasse le seuil (${metric.value}${metric.unit})`);
        alertCache.current.add(key);
      }
      if (metric.value <= metric.threshold && alertCache.current.has(key)) {
        alertCache.current.delete(key);
      }
    });
  }, [metricsQuery.data]);

  const defaultSource = useMemo(() => {
    if (sourceFilter !== 'all') return sourceFilter;
    return consoleQuery.data?.sources[0] ?? 'powens';
  }, [sourceFilter, consoleQuery.data]);

  const webhookMutation = useMutation({
    mutationFn: sendTestWebhook,
    onSuccess: () => {
      toast.success('Webhook test injecté');
      void consoleQuery.refetch();
    },
    onError: () => toast.error('Impossible de déclencher le webhook test'),
  });

  const filteredEvents = consoleQuery.data?.events ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <Card
          title="Console unifiée"
          description="Sources consolidées Powens / Drimify / Rewards"
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                webhookMutation.mutate({
                  source: defaultSource,
                  status: 'success',
                  payloadPreview: 'Test manuel',
                })
              }
              isLoading={webhookMutation.isPending}
            >
              Envoyer un webhook test
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              <option value="all">Toutes les sources</option>
              {(consoleQuery.data?.sources ?? []).map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-6 space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-ink/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{event.source}</p>
                    <p className="text-xs text-ink/50">{event.payloadPreview}</p>
                  </div>
                  <Badge
                    tone={event.status === 'success' ? 'success' : event.status === 'warning' ? 'warning' : 'muted'}
                    className="capitalize"
                  >
                    {event.status}
                  </Badge>
                </div>
                {event.receivedAt && (
                  <p className="mt-2 text-xs text-ink/40">{formatDate(event.receivedAt)}</p>
                )}
              </div>
            ))}
            {!filteredEvents.length && (
              <p className="text-sm text-ink/50">
                Aucun événement pour cette source dans les 30 dernières minutes.
              </p>
            )}
          </div>
        </Card>

        <Card title="Métriques Prometheus" description="Latence, erreurs, files d’attente">
          <div className="space-y-4">
            {(metricsQuery.data ?? []).map((metric) => (
              <MetricRow key={metric.name} metric={metric} />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Santé monitoring" description="GET /monitoring/health">
        {healthQuery.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-ink/5 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">Statut plateforme</p>
                {healthQuery.data.lastHeartbeat && (
                  <p className="text-xs text-ink/50">Dernier heartbeat {formatDate(healthQuery.data.lastHeartbeat)}</p>
                )}
              </div>
              <Badge tone={healthQuery.data.status === 'up' ? 'success' : healthQuery.data.status === 'degraded' ? 'warning' : 'muted'}>
                {healthQuery.data.status}
              </Badge>
            </div>
            {(healthQuery.data.metrics ?? []).map((metric) => (
              <MetricRow key={`health-${metric.name}`} metric={metric} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/50">Chargement des métriques…</p>
        )}
      </Card>
    </div>
  );
};

const MetricRow = ({ metric, compact = false }: { metric: MonitoringMetric; compact?: boolean }) => {
  const ratio = Math.min(1, metric.value / metric.threshold);
  const isOver = metric.value > metric.threshold;
  return (
    <div className="rounded-2xl border border-ink/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{metric.name}</p>
          <p className="text-xs text-ink/50">
            {metric.value}
            {metric.unit} / seuil {metric.threshold}
            {metric.unit}
          </p>
        </div>
        {isOver && <Badge tone="warning">Alerte</Badge>}
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {!compact && metric.history && metric.history.length > 1 && (
        <div className="mt-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metric.history}>
              <defs>
                <linearGradient id={`area-${metric.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4B2AAD" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#4B2AAD" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis hide domain={[0, metric.threshold * 1.5]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4B2AAD"
                fillOpacity={1}
                fill={`url(#area-${metric.name})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};


