import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BoxUpForm } from '../components/box-up-form';
import { fetchBoxUps, deleteBoxUp } from '../api-box-up';
import type { BoxUp } from '@/types/gifts';
import { HowItWorks } from '@/components/how-it-works';

export const BoxUpPage = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBox, setEditingBox] = useState<BoxUp | undefined>();

  const boxesQuery = useQuery({
    queryKey: ['box-ups'],
    queryFn: fetchBoxUps,
    enabled: !showForm || !editingBox,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBoxUp,
    onSuccess: () => {
      toast.success('Box Up supprimée');
      void queryClient.invalidateQueries({ queryKey: ['box-ups'] });
    },
    onError: () => toast.error('Impossible de supprimer la box'),
  });

  const handleSuccess = () => {
    setShowForm(false);
    setEditingBox(undefined);
    void queryClient.invalidateQueries({ queryKey: ['box-ups'] });
  };

  return (
    <div className="space-y-6">
      {showForm && (
        <BoxUpForm
          box={editingBox}
          onSuccess={handleSuccess}
        />
      )}

      {!showForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingBox(undefined);
              setShowForm(true);
            }}
          >
            Créer une Box
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(boxesQuery.data ?? []).map((box) => (
          <Card key={box.id}>
            <div className="space-y-3">
              {box.imageUrl && (
                <img
                  src={box.imageUrl}
                  alt={box.nom}
                  className="h-32 w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{box.nom}</h3>
                  <Badge tone={box.status === 'active' ? 'success' : 'warning'}>
                    {box.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink/70 line-clamp-2">{box.description}</p>
                <div className="mt-2 space-y-1 text-xs text-ink/60">
                  <p>Partenaires: {box.partenaires.length}</p>
                  <div className="space-y-1">
                    {box.partenaires.map((partner, index) => (
                      <div key={index} className="rounded bg-ink/5 p-2">
                        <p className="font-medium">{partner.partenaireName || partner.partenaireId}</p>
                        <p className="text-xs">{partner.offrePartenaire}</p>
                        {partner.conditions && (
                          <p className="text-xs text-ink/50 mt-1">{partner.conditions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {box.commentCaMarche && (
                <div className="mt-2">
                  <HowItWorks content={box.commentCaMarche} />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingBox(box);
                    setShowForm(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette box ?')) {
                      deleteMutation.mutate(box.id);
                    }
                  }}
                  isLoading={deleteMutation.isPending}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {boxesQuery.data?.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucune Box Up créée</p>
        </Card>
      )}
    </div>
  );
};

