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

export const ChallengesTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>();
  const queryClient = useQueryClient();

  const rewardsQuery = useQuery({
    queryKey: ['rewards', 'challenge'],
    queryFn: () => fetchRewardsByType('challenge'),
    enabled: !showForm || !editingReward,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const rewards = rewardsQuery.data ?? [];
  const partners = partnersQuery.data?.partners ?? [];

  const getPartnerNames = (partnerIds?: string[]) => {
    if (!partnerIds || partnerIds.length === 0) return 'Aucun partenaire';
    return partnerIds
      .map((id) => partners.find((p) => p.id === id)?.name || id)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Défis</h2>
          <p className="text-sm text-ink/50">Progression multi-étapes</p>
        </div>
        <Button
          onClick={() => {
            setEditingReward(undefined);
            setShowForm(true);
          }}
        >
          Créer un défi
        </Button>
      </div>

      <HowItWorks
        content="Les défis sont des objectifs à atteindre sur une période donnée. Les utilisateurs doivent réaliser un certain nombre de transactions chez des partenaires spécifiques ou d'une typologie particulière. Une fois le défi relevé, les participants reçoivent une récompense."
      />

      {showForm && (
        <RewardForm
          type="challenge"
          reward={editingReward}
          onSuccess={() => {
            setShowForm(false);
            setEditingReward(undefined);
            void queryClient.invalidateQueries({ queryKey: ['rewards', 'challenge'] });
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <Card key={reward.id}>
            <div className="space-y-3">
              {reward.imageUrl && (
                <img 
                  src={normalizeImageUrl(reward.imageUrl) ?? reward.imageUrl} 
                  alt={reward.title} 
                  className="h-32 w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{reward.title}</h3>
                  <Badge tone={reward.status === 'active' ? 'success' : 'warning'}>
                    {reward.status === 'active' ? 'Actif' : reward.status === 'draft' ? 'Brouillon' : 'Archivé'}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-ink/70">
                  {reward.category && (
                    <p>
                      <span className="font-medium text-ink">Catégorie (Badges & points):</span>{' '}
                      {reward.category}
                    </p>
                  )}
                  {reward.challengeStartAt && (
                    <p>Début: {formatDate(reward.challengeStartAt)}</p>
                  )}
                  {reward.challengeEndAt && (
                    <p>Fin: {formatDate(reward.challengeEndAt)}</p>
                  )}
                  {reward.stock != null && (
                    <p>Stock: {(reward.stock ?? 0).toLocaleString()}</p>
                  )}
                  {reward.challengeTransactionCount != null && reward.challengeTransactionCount > 0 && (
                    <p>Transactions requises: {reward.challengeTransactionCount}</p>
                  )}
                  {reward.rewardPoints !== undefined && (
                    <p className="font-medium text-ink">
                      Points à la réussite: {reward.rewardPoints} pts
                    </p>
                  )}
                  {reward.challengePartnerCategory && (
                    <p>Typologie partenaires: {reward.challengePartnerCategory}</p>
                  )}
                  {reward.challengePartnerIds && reward.challengePartnerIds.length > 0 && (
                    <p className="text-xs">Partenaires: {getPartnerNames(reward.challengePartnerIds)}</p>
                  )}
                  {reward.participantCount != null && (
                    <p>Participants: {(reward.participantCount ?? 0).toLocaleString()}</p>
                  )}
                </div>
                {reward.conditions && (
                  <div className="mt-3">
                    <Conditions conditions={reward.conditions} />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
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
          </Card>
        ))}
      </div>

      {rewards.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucun défi créé</p>
        </Card>
      )}
    </div>
  );
};

