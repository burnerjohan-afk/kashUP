import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RewardForm } from './reward-form';
import { LotteryCountdown } from './lottery-countdown';
import { HowItWorks } from '@/components/how-it-works';
import { Conditions } from '@/components/conditions';
import { deleteReward, fetchRewardsByType } from '../api';
import type { Reward } from '@/types/entities';
import { fetchPartners } from '@/features/partners/api';
import { formatDate } from '@/lib/utils/format';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

export const LotteriesTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | undefined>();

  const rewardsQuery = useQuery({
    queryKey: ['rewards', 'lottery'],
    queryFn: () => fetchRewardsByType('lottery'),
    enabled: !showForm || !editingReward,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const rewards = rewardsQuery.data ?? [];
  const partners = partnersQuery.data?.partners ?? [];

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteReward(id, 'lottery'),
    onSuccess: () => {
      toast.success('Loterie supprimée');
      void queryClient.invalidateQueries({ queryKey: ['rewards', 'lottery'] });
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Impossible de supprimer la loterie');
    },
  });

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
          <h2 className="text-xl font-bold text-ink">Loteries</h2>
          <p className="text-sm text-ink/50">Gestion tirages & dotations</p>
        </div>
        <Button
          onClick={() => {
            setEditingReward(undefined);
            setShowForm(true);
          }}
        >
          Créer une loterie
        </Button>
      </div>

      <HowItWorks
        content="Les loteries permettent aux utilisateurs de participer à des tirages au sort en utilisant leurs points. Chaque ticket coûte un certain nombre de points et les utilisateurs peuvent acheter plusieurs tickets selon la limite définie. À la fin de la période, un tirage au sort détermine les gagnants parmi tous les participants."
      />

      {showForm && (
        <RewardForm
          type="lottery"
          reward={editingReward}
          onSuccess={() => {
            setShowForm(false);
            setEditingReward(undefined);
            void queryClient.invalidateQueries({ queryKey: ['rewards', 'lottery'] });
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
                  {reward.startAt && reward.endAt && (
                    <LotteryCountdown startAt={reward.startAt} endAt={reward.endAt} />
                  )}
                  {reward.startAt && (
                    <p>Début: {formatDate(reward.startAt)}</p>
                  )}
                  {reward.endAt && (
                    <p>Fin: {formatDate(reward.endAt)}</p>
                  )}
                  <p>Stock: {(reward.stock ?? reward.totalTicketsAvailable ?? 0).toLocaleString()}</p>
                  {reward.pointsRequired && (
                    <p>Points requis: {reward.pointsRequired}</p>
                  )}
                  {reward.maxTicketsPerUser !== null && reward.maxTicketsPerUser !== undefined ? (
                    <p>Tickets max/utilisateur: {reward.maxTicketsPerUser}</p>
                  ) : (
                    <p>Tickets max/utilisateur: Illimité</p>
                  )}
                  {reward.partnerIds && reward.partnerIds.length > 0 && (
                    <p className="text-xs">Partenaires: {getPartnerNames(reward.partnerIds)}</p>
                  )}
                  {reward.participantCount != null && (
                    <p>Participants: {(reward.participantCount ?? 0).toLocaleString()}</p>
                  )}
                </div>
                {reward.rules && (
                  <div className="mt-2 rounded-lg bg-ink/5 p-2">
                    <p className="text-xs font-semibold text-ink/70">Règlement:</p>
                    <p className="mt-1 text-xs text-ink/60 line-clamp-3">{reward.rules}</p>
                  </div>
                )}
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
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Supprimer cette loterie ? Elle ne sera plus visible (suppression logique).')) {
                      deleteMutation.mutate({ id: reward.id });
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {rewards.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucune loterie créée</p>
        </Card>
      )}
    </div>
  );
};

