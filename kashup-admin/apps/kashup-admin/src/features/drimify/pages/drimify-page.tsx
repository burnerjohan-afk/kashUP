import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchDrimifyExperiences, playExperience, triggerDrimifyWebhook } from '../api';
import type { DrimifyExperience } from '@/types/entities';
import { formatDate } from '@/lib/utils/format';

export const DrimifyPage = () => {
  const experiencesQuery = useQuery({
    queryKey: ['drimify-experiences'],
    queryFn: fetchDrimifyExperiences,
  });

  const playMutation = useMutation({
    mutationFn: playExperience,
    onSuccess: () => toast.success('Expérience déclenchée'),
    onError: () => toast.error('Impossible de déclencher'),
  });

  const webhookMutation = useMutation({
    mutationFn: triggerDrimifyWebhook,
    onSuccess: () => toast.success('Webhook Drimify simulé'),
    onError: () => toast.error('Impossible de simuler le webhook'),
  });

  return (
    <Card
      title="Drimify expériences"
      description="Catalogue jeux, statut campagnes, déclenchement manuel"
      actions={
        <Button
          variant="secondary"
          onClick={() => void webhookMutation.mutate()}
          isLoading={webhookMutation.isPending}
        >
          Simuler webhook
        </Button>
      }
    >
      <div className="space-y-4">
        {(experiencesQuery.data ?? []).map((experience) => (
          <ExperienceRow
            key={experience.id}
            experience={experience}
            onPlay={() => void playMutation.mutate(experience.id)}
            isLoading={playMutation.isPending}
          />
        ))}
      </div>
    </Card>
  );
};

const ExperienceRow = ({
  experience,
  onPlay,
  isLoading,
}: {
  experience: DrimifyExperience;
  onPlay: () => void;
  isLoading: boolean;
}) => (
  <div className="rounded-2xl border border-ink/5 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink">{experience.title}</p>
        <p className="text-xs text-ink/50">
          {formatDate(experience.startAt)} → {formatDate(experience.endAt)}
        </p>
      </div>
      <Badge tone={experience.status === 'live' ? 'success' : 'warning'}>{experience.status}</Badge>
    </div>
    <p className="text-xs text-ink/40">{experience.participants} participants</p>
    <Button variant="ghost" className="mt-2 text-xs" onClick={onPlay} isLoading={isLoading}>
      Déclencher l’expérience
    </Button>
  </div>
);

