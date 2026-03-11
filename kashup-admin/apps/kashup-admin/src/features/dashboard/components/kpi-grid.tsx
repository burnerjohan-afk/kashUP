import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import type { DashboardKpis, ImpactStat } from '../api';

type KpiGridProps = {
  kpis: DashboardKpis;
  impact?: ImpactStat[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

export const KpiGrid = ({ kpis, impact }: KpiGridProps) => {
  // Valeurs par défaut si kpis est undefined ou incomplet
  const safeKpis = {
    cashbackVolume: kpis?.cashbackVolume ?? 0,
    pointsInjected: kpis?.pointsInjected ?? 0,
    activeUsers: kpis?.activeUsers ?? 0,
    activePartners: kpis?.activePartners ?? 0,
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <Card title="CA Cashback" description="24h glissantes">
        <p className="text-2xl font-semibold text-primary">{formatCurrency(safeKpis.cashbackVolume)}</p>
        <p className="text-xs text-ink/50">Cashback ventilé vers les utilisateurs</p>
      </Card>
      <Card title="Points injectés" description="+ boosts & challenges">
        <p className="text-2xl font-semibold text-primary">{formatNumber(safeKpis.pointsInjected)}</p>
        <p className="text-xs text-ink/50">Points mis en circulation</p>
      </Card>
      <Card title="Utilisateurs actifs" description="7 derniers jours">
        <p className="text-2xl font-semibold text-primary">{formatNumber(safeKpis.activeUsers)}</p>
        <p className="text-xs text-ink/50">Sessions {'>'} 2 actions</p>
      </Card>
      <Card title="Partenaires actifs" description="offres live">
        <p className="text-2xl font-semibold text-primary">{formatNumber(safeKpis.activePartners)}</p>
        <p className="text-xs text-ink/50">Partenaires ayant généré des transactions</p>
      </Card>

      {impact && Array.isArray(impact) && impact.length > 0 && (
        <Card
          title="Impact local"
          description="CO₂ évités & dons cumulés"
          className="md:col-span-2 xl:col-span-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {impact
              .filter((item) => item && (item.territory || item.co2SavedKg !== undefined || item.donationsEur !== undefined))
              .map((item, index) => {
                // S'assurer que territory est une string, pas un objet
                const territoryName = typeof item.territory === 'string' 
                  ? item.territory 
                  : (item.territory as { id?: string; name?: string })?.name || `Territoire ${index + 1}`;
                
                // Clé sécurisée
                const safeKey = territoryName || `impact-${index}`;
                
                return (
                  <div key={safeKey} className="rounded-2xl bg-ink/5 p-4">
                    <p className="text-xs uppercase text-ink/40">{territoryName}</p>
                    <p className="text-sm text-ink/70">
                      {item.co2SavedKg ?? 0}kg CO₂ évités / {formatCurrency(item.donationsEur ?? 0)} reversés
                    </p>
                    <p className="text-xs text-ink/50">
                      {item.localShopsSupported ?? 0} commerces soutenus
                    </p>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
};

