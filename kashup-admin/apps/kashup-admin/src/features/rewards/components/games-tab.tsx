import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HowItWorks } from '@/components/how-it-works';
import { fetchDrimifyExperiences, playExperience } from '@/features/drimify/api';
import type { DrimifyExperience } from '@/types/entities';
import { formatDate } from '@/lib/utils/format';

export const GamesTab = () => {
  const experiencesQuery = useQuery({
    queryKey: ['drimify-experiences'],
    queryFn: fetchDrimifyExperiences,
  });

  const playMutation = useMutation({
    mutationFn: playExperience,
    onSuccess: () => toast.success('Expérience déclenchée'),
    onError: () => toast.error('Impossible de déclencher'),
  });

  const experiences = experiencesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">Jeux</h2>
        <p className="text-sm text-ink/50">Expériences interactives via Drimify</p>
      </div>

      <HowItWorks
        content="Les jeux sont des expériences interactives créées via la plateforme Drimify. Ils permettent d'engager les utilisateurs de manière ludique avec des quiz, des jeux concours, des scratch cards, etc. Les jeux peuvent être configurés avec des dates de début et de fin, et offrir des récompenses aux participants."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {experiences.map((experience) => (
          <Card key={experience.id}>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{experience.title}</h3>
                  <Badge tone={experience.status === 'live' ? 'success' : 'warning'}>
                    {experience.status === 'live' ? 'En ligne' : experience.status === 'draft' ? 'Brouillon' : 'Terminé'}
                  </Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-ink/70">
                  <p>
                    {formatDate(experience.startAt)} → {formatDate(experience.endAt)}
                  </p>
                  <p>Participants: {experience.participants.toLocaleString()}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void playMutation.mutate(experience.id)}
                isLoading={playMutation.isPending}
              >
                Déclencher l'expérience
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {experiences.length === 0 && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucune expérience Drimify disponible</p>
        </Card>
      )}
    </div>
  );
};

