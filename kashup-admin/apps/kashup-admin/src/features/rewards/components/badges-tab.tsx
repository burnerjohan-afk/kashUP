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

export const BadgesTab = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>();
  const queryClient = useQueryClient();

  const rewardsQuery = useQuery({
    queryKey: ['rewards', 'badge'],
    queryFn: () => fetchRewardsByType('badge'),
    enabled: !showForm || !editingReward,
  });

  const rewards = rewardsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Badges</h2>
          <p className="text-sm text-ink/50">Badges progressifs</p>
        </div>
        <Button
          onClick={() => {
            setEditingReward(undefined);
            setShowForm(true);
          }}
        >
          Créer un badge
        </Button>
      </div>

      <HowItWorks
        content="Les badges sont des récompenses obtenues en réalisant un certain nombre de transactions chez des partenaires d'un type spécifique. Une fois le nombre de transactions requis atteint, le badge est automatiquement débloqué et peut offrir des avantages supplémentaires."
      />

      {showForm && (
        <RewardForm
          type="badge"
          reward={editingReward}
          onSuccess={() => {
            setShowForm(false);
            setEditingReward(undefined);
            void queryClient.invalidateQueries({ queryKey: ['rewards', 'badge'] });
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <Card key={reward.id}>
            <div className="space-y-3">
              {reward.imageUrl && (
                <img 
                  src={reward.imageUrl} 
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
                  <p>Durée: {reward.duration} jours</p>
                  {reward.transactionCount && (
                    <p>Transactions requises: {reward.transactionCount}</p>
                  )}
                  {reward.partnerCategory && <p>Type de partenaires: {reward.partnerCategory}</p>}
                  {reward.participantCount !== undefined && (
                    <p>Participants: {reward.participantCount.toLocaleString()}</p>
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
          <p className="text-center text-sm text-ink/50">Aucun badge créé</p>
        </Card>
      )}
    </div>
  );
};

