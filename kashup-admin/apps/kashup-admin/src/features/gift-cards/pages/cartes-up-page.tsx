import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CarteUpLibreForm } from '../components/carte-up-libre-form';
import { CarteUpPredefinieForm } from '../components/carte-up-predefinie-form';
import { CarteTestPreview } from '../components/carte-test-preview';
import {
  fetchCartesUpLibres,
  fetchCartesUpPredefinies,
  deleteCarteUpLibre,
  deleteCarteUpPredefinie,
} from '../api-cartes-up';
import type { CarteUpLibre, CarteUpPredefinie } from '@/types/gifts';
import { Conditions } from '@/components/conditions';
import { HowItWorks } from '@/components/how-it-works';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

export const CartesUpPage = () => {
  const queryClient = useQueryClient();
  const [showLibreForm, setShowLibreForm] = useState(false);
  const [showPredefinieForm, setShowPredefinieForm] = useState(false);
  const [editingLibre, setEditingLibre] = useState<CarteUpLibre | undefined>();
  const [editingPredefinie, setEditingPredefinie] = useState<CarteUpPredefinie | undefined>();

  const libresQuery = useQuery({
    queryKey: ['cartes-up-libres'],
    queryFn: fetchCartesUpLibres,
    enabled: !showLibreForm || !editingLibre,
  });

  const predefiniesQuery = useQuery({
    queryKey: ['cartes-up-predefinies'],
    queryFn: fetchCartesUpPredefinies,
    enabled: !showPredefinieForm || !editingPredefinie,
  });

  const deleteLibreMutation = useMutation({
    mutationFn: deleteCarteUpLibre,
    onSuccess: () => {
      toast.success('Configuration Carte Sélection UP supprimée');
      void queryClient.invalidateQueries({ queryKey: ['cartes-up-libres'] });
    },
    onError: () => toast.error('Impossible de supprimer la carte'),
  });

  const deletePredefinieMutation = useMutation({
    mutationFn: deleteCarteUpPredefinie,
    onSuccess: () => {
      toast.success('Carte UP supprimée');
      void queryClient.invalidateQueries({ queryKey: ['cartes-up-predefinies'] });
    },
    onError: () => toast.error('Impossible de supprimer la carte'),
  });

  const handleLibreSuccess = () => {
    setShowLibreForm(false);
    setEditingLibre(undefined);
    void queryClient.invalidateQueries({ queryKey: ['cartes-up-libres'] });
  };

  const handlePredefinieSuccess = () => {
    setShowPredefinieForm(false);
    setEditingPredefinie(undefined);
    void queryClient.invalidateQueries({ queryKey: ['cartes-up-predefinies'] });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="libres" className="space-y-6">
        <TabsList>
          <TabsTrigger value="libres">Carte Sélection UP</TabsTrigger>
          <TabsTrigger value="predefinies">Carte UP</TabsTrigger>
        </TabsList>

        <TabsContent value="libres" className="space-y-6">
          <HowItWorks
            content="La Carte Sélection UP permet à l'utilisateur de créer sa carte cadeau lui-même : il choisit un partenaire, un montant, un texte, une image et un macaron (ex. Joyeux anniversaire, Bonne fête… ou pastille libre). Utilisez la carte test ci-dessous pour prévisualiser le rendu."
          />

          {showLibreForm && (
            <CarteUpLibreForm
              carte={editingLibre}
              onSuccess={handleLibreSuccess}
            />
          )}

          {!showLibreForm && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingLibre(undefined);
                  setShowLibreForm(true);
                }}
              >
                Configurer la Carte Sélection UP
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(libresQuery.data ?? []).map((carte) => (
              <Card key={carte.id}>
                <div className="space-y-3">
                  {carte.imageUrl && (
                    <img
                      src={normalizeImageUrl(carte.imageUrl) ?? carte.imageUrl}
                      alt={carte.nom}
                      className="h-32 w-full rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-ink">{carte.nom}</h3>
                      <Badge tone={carte.status === 'active' ? 'success' : 'warning'}>
                        {carte.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink/70 line-clamp-2">{carte.description}</p>
                    <div className="mt-2 space-y-1 text-xs text-ink/60">
                      <p>
                        Montant : {carte.montantsDisponibles.length > 0
                          ? carte.montantsDisponibles.map((m) => `${m}€`).join(', ')
                          : 'libre (défini par l\'utilisateur)'}
                      </p>
                      <p>Partenaires: {carte.partenairesEligibles.length}</p>
                    </div>
                  </div>
                  {carte.conditions && (
                    <div className="mt-2">
                      <Conditions conditions={carte.conditions} />
                    </div>
                  )}
                  {carte.commentCaMarche && (
                    <div className="mt-2">
                      <HowItWorks content={carte.commentCaMarche} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingLibre(carte);
                        setShowLibreForm(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
                          deleteLibreMutation.mutate(carte.id);
                        }
                      }}
                      isLoading={deleteLibreMutation.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {libresQuery.data?.length === 0 && !showLibreForm && (
            <Card>
              <p className="text-center text-sm text-ink/50">Aucune configuration Carte Sélection UP</p>
            </Card>
          )}

          <CarteTestPreview />
        </TabsContent>

        <TabsContent value="predefinies" className="space-y-6">
          <HowItWorks
            content="La Carte UP est créée par l'administrateur : partenaire, montant, image, durée de validité. L'utilisateur qui choisit cette carte pourra ajouter un texte et un macaron."
          />

          {showPredefinieForm && (
            <CarteUpPredefinieForm
              carte={editingPredefinie}
              onSuccess={handlePredefinieSuccess}
            />
          )}

          {!showPredefinieForm && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingPredefinie(undefined);
                  setShowPredefinieForm(true);
                }}
              >
                Créer une Carte UP
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(predefiniesQuery.data ?? []).map((carte) => (
              <Card key={carte.id}>
                <div className="space-y-3">
                  {carte.imageUrl && (
                    <img
                      src={normalizeImageUrl(carte.imageUrl) ?? carte.imageUrl}
                      alt={carte.nom}
                      className="h-32 w-full rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-ink">{carte.nom}</h3>
                      <Badge tone={carte.status === 'active' ? 'success' : 'warning'}>
                        {carte.status === 'active' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink/70 line-clamp-2">{carte.description}</p>
                    <div className="mt-2 space-y-1 text-xs text-ink/60">
                      <p>Partenaire: {carte.partenaireName || carte.partenaireId}</p>
                      {carte.offre && <p>Offre: {carte.offre}</p>}
                      <p>Montant: {carte.montant}€</p>
                      {carte.dureeValiditeJours != null && (
                        <p>Validité: {carte.dureeValiditeJours} jours</p>
                      )}
                    </div>
                  </div>
                  {carte.conditions && (
                    <div className="mt-2">
                      <Conditions conditions={carte.conditions} />
                    </div>
                  )}
                  {carte.commentCaMarche && (
                    <div className="mt-2">
                      <HowItWorks content={carte.commentCaMarche} />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingPredefinie(carte);
                        setShowPredefinieForm(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
                          deletePredefinieMutation.mutate(carte.id);
                        }
                      }}
                      isLoading={deletePredefinieMutation.isPending}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {predefiniesQuery.data?.length === 0 && !showPredefinieForm && (
            <Card>
              <p className="text-center text-sm text-ink/50">Aucune Carte UP créée</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

