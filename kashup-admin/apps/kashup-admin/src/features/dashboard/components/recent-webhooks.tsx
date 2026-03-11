import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WebhookEvent } from '@/types/entities';
import { formatDate } from '@/lib/utils/format';

const toneByStatus: Record<WebhookEvent['status'], 'success' | 'warning' | 'muted'> = {
  success: 'success',
  warning: 'warning',
  error: 'muted',
};

type RecentWebhooksProps = {
  events: WebhookEvent[];
};

export const RecentWebhooks = ({ events }: RecentWebhooksProps) => {
  // S'assurer que events est un tableau
  const safeEvents = Array.isArray(events) ? events : [];

  return (
    <Card title="Webhooks récents" description="Sources consolidées" className="h-full">
      <div className="space-y-4">
        {safeEvents.length > 0 ? (
          safeEvents
            .filter((event) => event && (event.id || event.source || event.receivedAt)) // Filtrer les événements invalides
            .map((event, index) => {
              // S'assurer que source et payloadPreview sont des strings
              const source = typeof event.source === 'string' 
                ? event.source 
                : (event.source as { id?: string; name?: string })?.name || 'Source inconnue';
              const payloadPreview = typeof event.payloadPreview === 'string'
                ? event.payloadPreview
                : String(event.payloadPreview || '');

              // Clé sécurisée : utiliser id si disponible, sinon index + source
              const safeKey = event.id || `webhook-${index}-${source}-${event.receivedAt || Date.now()}`;

              return (
                <div key={safeKey} className="rounded-2xl border border-ink/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{source}</p>
                    <p className="text-xs text-ink/50">{payloadPreview}</p>
                  </div>
                  <Badge tone={toneByStatus[event.status]} className="capitalize">
                    {event.status}
                  </Badge>
                </div>
                {event.receivedAt && (
                  <p className="mt-2 text-xs text-ink/40">{formatDate(event.receivedAt)}</p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm text-ink/50">Aucun webhook récent</p>
        )}
      </div>
    </Card>
  );
};

