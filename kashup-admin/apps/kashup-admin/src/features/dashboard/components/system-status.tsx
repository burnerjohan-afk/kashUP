import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServiceStatus } from '../api';
import { formatDate } from '@/lib/utils/format';

const toneByStatus: Record<ServiceStatus['status'], 'success' | 'warning' | 'muted'> = {
  up: 'success',
  warning: 'warning',
  down: 'muted',
};

type SystemStatusProps = {
  services: ServiceStatus[] | number | null | undefined;
  servicesCount?: number;
};

export const SystemStatus = ({ services, servicesCount }: SystemStatusProps) => {
  // S'assurer que services est un tableau et transformer les données si nécessaire
  const servicesArray = Array.isArray(services) ? services : [];
  const safeServices = servicesArray.map((service) => {
    // Si name est un objet avec id/name, extraire le nom
    const serviceName = typeof service.name === 'string' 
      ? service.name 
      : (service.name as { id?: string; name?: string })?.name || 'Service inconnu';
    
    return {
      ...service,
      name: serviceName,
    };
  });

  const count =
    typeof services === 'number'
      ? services
      : servicesCount ?? safeServices.length;

  return (
    <Card title="Statut Powens / Drimify / Notifications" description="Monitoring temps réel">
      <div className="space-y-4">
        <p className="text-xs text-ink/60">Nombre de services : {count}</p>
        {safeServices.map((service) => (
          <div key={service.name} className="flex items-center justify-between rounded-2xl bg-ink/5 p-4">
            <div>
              <p className="font-semibold text-ink">{service.name}</p>
            <p className="text-xs text-ink/50">
              Latence {service.latencyMs}ms • {service.incidents24h} incidents /24h
            </p>
          </div>
          <div className="text-right">
            <Badge tone={toneByStatus[service.status]}>
              {service.status === 'up' && 'Opérationnel'}
              {service.status === 'warning' && 'Dégradé'}
              {service.status === 'down' && 'Incident'}
            </Badge>
            <p className="text-xs text-ink/40">{formatDate(service.lastCheckedAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

