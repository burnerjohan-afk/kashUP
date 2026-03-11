import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchGiftSendLogs } from '../api-gift-send';
import type { GiftSendLog } from '@/types/gifts';
import { formatDate } from '@/lib/utils/format';

export const GiftSendLogsPage = () => {
  const logsQuery = useQuery({
    queryKey: ['gift-send-logs'],
    queryFn: fetchGiftSendLogs,
  });

  const getStatusBadge = (statut: GiftSendLog['statut']) => {
    switch (statut) {
      case 'envoye':
        return <Badge tone="success">Envoyé</Badge>;
      case 'en_attente':
        return <Badge tone="warning">En attente</Badge>;
      case 'echoue':
        return <Badge tone="warning">Échoué</Badge>;
      default:
        return <Badge>{statut}</Badge>;
    }
  };

  const getTypeLabel = (type: GiftSendLog['type']) => {
    switch (type) {
      case 'carte-up-libre':
        return 'Carte Up libre';
      case 'carte-up-predefinie':
        return 'Carte Up pré-définie';
      case 'box-up':
        return 'Box Up';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notifications d'envoi cadeaux</h1>
          <p className="text-sm text-ink/50">Historique des envois de cartes et boxes</p>
        </div>
      </div>

      <Card title="Logs d'envoi" description="Suivi de tous les envois de cadeaux">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Cadeau</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Expéditeur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Destinataire</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-ink/50">Date d'envoi</th>
              </tr>
            </thead>
            <tbody>
              {(logsQuery.data ?? []).map((log) => (
                <tr key={log.id} className="border-b border-ink/5 hover:bg-ink/5">
                  <td className="px-4 py-3 text-sm text-ink">{log.cadeauNom}</td>
                  <td className="px-4 py-3 text-sm text-ink/70">{getTypeLabel(log.type)}</td>
                  <td className="px-4 py-3 text-sm text-ink/70">
                    {log.expediteurEmail || log.expediteurId || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink/70">
                    {log.destinataireEmail || log.destinataireUserId || '-'}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(log.statut)}</td>
                  <td className="px-4 py-3 text-sm text-ink/70">
                    {log.dateEnvoi ? formatDate(log.dateEnvoi) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logsQuery.data?.length === 0 && (
          <div className="py-8 text-center text-sm text-ink/50">
            Aucun log d'envoi enregistré
          </div>
        )}
      </Card>
    </div>
  );
};

