import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RewardForm } from './reward-form';
import { HowItWorks } from '@/components/how-it-works';
import { Conditions } from '@/components/conditions';
import { fetchRewardsByType } from '../api';
import type { Reward } from '@/types/entities';
import { fetchPartners } from '@/features/partners/api';
import { formatDate } from '@/lib/utils/format';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

export const BoostsTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>();
  const queryClient = useQueryClient();

  const rewardsQuery = useQuery({
    queryKey: ['rewards', 'boost'],
    queryFn: () => fetchRewardsByType('boost'),
    enabled: !showForm || !editingReward,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const rewards = rewardsQuery.data ?? [];
  const partners = partnersQuery.data?.partners ?? [];

  const getPartnerName = (partnerId?: string) => {
    if (!partnerId) return undefined;
    return partners.find((p) => p.id === partnerId)?.name;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Boosts</h2>
          <p className="text-sm text-ink/50">Dotations instantanées et multiplicateurs</p>
        </div>
        <Button
          onClick={() => {
            setEditingReward(undefined);
            setShowForm(true);
          }}
        >
          Créer un boost
        </Button>
      </div>

      <HowItWorks
        content="Les boosts sont des multiplicateurs de cashback temporaires qui augmentent le taux de cashback sur vos transactions. Vous pouvez les activer pour une durée limitée et ils s'appliquent automatiquement aux transactions éligibles selon les critères définis (partenaires, typologie d'utilisateurs, etc.)."
      />

      {showForm && (
        <RewardForm
          type="boost"
          reward={editingReward}
          onSuccess={() => {
            setShowForm(false);
            setEditingReward(undefined);
            void queryClient.invalidateQueries({ queryKey: ['rewards', 'boost'] });
          }}
        />
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Bandeau d'accent type boost */}
            <div className="flex h-1.5 w-full shrink-0 bg-gradient-to-r from-amber-400 to-amber-600" aria-hidden />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-semibold text-ink">{reward.title}</h3>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-amber-600/80">Multiplicateur</p>
                </div>
                <Badge tone={reward.status === 'active' ? 'success' : 'warning'}>
                  {reward.status === 'active' ? 'Actif' : reward.status === 'draft' ? 'Brouillon' : 'Archivé'}
                </Badge>
              </div>
              {reward.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-lg border border-ink/5">
                  <img
                    src={normalizeImageUrl(reward.imageUrl) ?? reward.imageUrl}
                    alt={reward.title}
                    className="h-28 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <dl className="mt-4 space-y-2 text-sm">
                {reward.boostRate != null && reward.boostRate > 0 && (
                  <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-1.5">
                    <span className="text-ink/70">Taux</span>
                    <span className="font-semibold text-amber-700">+{reward.boostRate}%</span>
                  </div>
                )}
                <div className="flex justify-between text-ink/70">
                  <span>Période</span>
                  <span>{reward.startAt && reward.endAt ? `${formatDate(reward.startAt)} → ${formatDate(reward.endAt)}` : '—'}</span>
                </div>
                {(reward.partnerId || reward.partnerCategoryFilter) && (
                  <div className="flex justify-between text-ink/70">
                    <span>Cible</span>
                    <span className="text-right">
                      {reward.partnerId ? getPartnerName(reward.partnerId) || reward.partnerId : reward.partnerCategoryFilter || '—'}
                    </span>
                  </div>
                )}
                {reward.pointsRequired != null && reward.pointsRequired > 0 && (
                  <div className="flex justify-between text-ink/70">
                    <span>Coût (points)</span>
                    <span>{reward.pointsRequired}</span>
                  </div>
                )}
              </dl>
              {reward.conditions && (
                <div className="mt-4 rounded-lg border border-ink/5 bg-ink/[0.02] p-3">
                  <Conditions conditions={reward.conditions} />
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingReward(reward);
                    setShowForm(true);
                  }}
                >
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rewards.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucun boost créé</p>
        </Card>
      )}
    </div>
  );
};

