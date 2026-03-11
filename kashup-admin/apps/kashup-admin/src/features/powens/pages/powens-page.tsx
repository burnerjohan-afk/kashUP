import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchPowensOverview, fetchPowensWebhooks, refreshPowensLink, triggerPowensWebhook } from '../api';
import type { PowensLink, PowensWebhook } from '@/types/entities';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { usePermissions, PermissionGuard } from '@/lib/permissions/permissions';
import { useAuditLog } from '@/lib/audit/audit-logger';

const toneByStatus: Record<PowensLink['status'], 'success' | 'warning' | 'muted'> = {
  active: 'success',
  syncing: 'warning',
  error: 'muted',
};

export const PowensPage = () => {
  const { hasPermission } = usePermissions();
  const auditLog = useAuditLog();
  const canViewPowens = hasPermission('powens:view');

  const overviewQuery = useQuery({
    queryKey: ['powens-overview'],
    queryFn: fetchPowensOverview,
    refetchInterval: 60_000,
    enabled: canViewPowens, // Ne pas charger si pas la permission
  });

  const webhooksQuery = useQuery({
    queryKey: ['powens-webhooks'],
    queryFn: fetchPowensWebhooks,
    refetchInterval: 30_000,
    enabled: canViewPowens,
  });

  // 🔒 AUDIT: Logger l'accès aux données Powens (DSP2)
  useEffect(() => {
    if (overviewQuery.data?.links && canViewPowens) {
      overviewQuery.data.links.forEach((link) => {
        // Note: Si les données Powens contiennent userId, logger l'accès
        // auditLog.logPowensAccess(link.userId);
      });
    }
  }, [overviewQuery.data, canViewPowens, auditLog]);

  const refreshLinkMutation = useMutation({
    mutationFn: refreshPowensLink,
    onSuccess: () => toast.success('Lien Powens relancé'),
    onError: () => toast.error('Impossible de relancer le lien'),
  });

  const triggerWebhookMutation = useMutation({
    mutationFn: triggerPowensWebhook,
    onSuccess: () => toast.success('Webhook déclenché'),
    onError: () => toast.error('Impossible de déclencher le webhook'),
  });

  if (!canViewPowens) {
    return (
      <Card title="Agrégation bancaire" description="Accès non autorisé">
        <p className="text-sm text-ink/50">
          Vous n'avez pas la permission d'accéder aux données bancaires (DSP2).
        </p>
      </Card>
    );
  }

  if (!overviewQuery.data) {
    return <p className="text-sm text-ink/60">Chargement Powens…</p>;
  }

  const { linkToken, links, alerts } = overviewQuery.data;

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <Card
          title="Agrégation bancaire"
          description="État liaisons, budgets, paiements"
          actions={
            <Button
              variant="secondary"
              onClick={() => void triggerWebhookMutation.mutate()}
              isLoading={triggerWebhookMutation.isPending}
            >
              Déclencher webhook QA
            </Button>
          }
        >
          <p className="text-sm text-ink/60">
            Link token courant : <span className="font-mono text-ink">{linkToken}</span>
          </p>
          <div className="mt-4 space-y-3">
            {links.map((link) => (
              <PowensLinkRow
                key={link.id}
                link={link}
                onRefresh={() => void refreshLinkMutation.mutate(link.id)}
                isLoading={refreshLinkMutation.isPending}
              />
            ))}
          </div>
        </Card>

        <Card title="Timeline webhooks" description="Powens events (POST /powens/webhook)">
          <div className="space-y-3">
            {(webhooksQuery.data ?? []).map((event) => (
              <PowensWebhookRow key={event.id} event={event} />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Alertes / Monitoring" description="Relances automatiques & budgets">
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.message}
              className="rounded-2xl border border-ink/5 p-4"
            >
              <Badge tone={alert.severity === 'critical' ? 'warning' : 'success'}>
                {alert.type}
              </Badge>
              <p className="mt-2 text-sm text-ink">{alert.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const PowensLinkRow = ({
  link,
  onRefresh,
  isLoading,
}: {
  link: PowensLink;
  onRefresh: () => void;
  isLoading: boolean;
}) => (
  <div className="rounded-2xl border border-ink/5 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink">{link.bank}</p>
        <p className="text-xs text-ink/50">{link.accounts} comptes connectés</p>
      </div>
      <Badge tone={toneByStatus[link.status]}>{link.status}</Badge>
    </div>
    <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink/60">
      <span>Budgets {formatCurrency(link.budgetTracked)}</span>
      <span>Paiements {link.paymentsActive}</span>
      <span>MAJ {formatDate(link.updatedAt)}</span>
    </div>
    <Button variant="ghost" className="mt-2 text-xs" onClick={onRefresh} isLoading={isLoading}>
      Relancer la synchro
    </Button>
  </div>
);

const PowensWebhookRow = ({ event }: { event: PowensWebhook }) => (
  <div className="rounded-2xl border border-ink/5 p-3">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-ink">{event.event}</p>
      <Badge tone={event.status === 'success' ? 'success' : 'warning'}>{event.status}</Badge>
    </div>
    <p className="text-xs text-ink/40">{formatDate(event.receivedAt)}</p>
  </div>
);

