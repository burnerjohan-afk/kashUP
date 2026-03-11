import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  fetchProjets,
  createProjet,
  updateProjet,
  deleteProjet,
  projetFormSchema,
} from '../api';
import type { Projet } from '@/types/entities';
import type { ProjetFormInput } from '../api';

export const ProjetsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | undefined>();

  const projetsQuery = useQuery({
    queryKey: ['projets'],
    queryFn: fetchProjets,
    enabled: !showForm || !editingProjet,
  });

  const form = useForm<ProjetFormInput>({
    resolver: zodResolver(projetFormSchema),
    defaultValues: {
      nom: '',
      descriptif: '',
      tonImpact: '',
      status: 'draft',
    },
  });

  // Mettre à jour le formulaire quand on édite
  useEffect(() => {
    if (editingProjet) {
      form.reset({
        nom: editingProjet.nom,
        descriptif: editingProjet.descriptif,
        tonImpact: editingProjet.tonImpact,
        status: editingProjet.status,
      });
    } else {
      form.reset({
        nom: '',
        descriptif: '',
        tonImpact: '',
        status: 'draft',
      });
    }
  }, [editingProjet, form]);

  const createMutation = useMutation({
    mutationFn: createProjet,
    onSuccess: () => {
      toast.success('Projet créé avec succès');
      form.reset();
      setShowForm(false);
      setEditingProjet(undefined);
      void queryClient.invalidateQueries({ queryKey: ['projets'] });
    },
    onError: () => toast.error('Impossible de créer le projet'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProjetFormInput> }) =>
      updateProjet(id, payload),
    onSuccess: () => {
      toast.success('Projet mis à jour avec succès');
      form.reset();
      setShowForm(false);
      setEditingProjet(undefined);
      void queryClient.invalidateQueries({ queryKey: ['projets'] });
    },
    onError: () => toast.error('Impossible de mettre à jour le projet'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjet,
    onSuccess: () => {
      toast.success('Projet supprimé');
      void queryClient.invalidateQueries({ queryKey: ['projets'] });
    },
    onError: () => toast.error('Impossible de supprimer le projet'),
  });

  const onSubmit = (values: ProjetFormInput) => {
    if (editingProjet) {
      updateMutation.mutate({ id: editingProjet.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      {showForm && (
        <Card title={editingProjet ? 'Modifier le projet' : 'Créer un projet'}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Nom du projet *</label>
              <Input placeholder="Ex: Projet de reforestation" {...form.register('nom')} />
              {form.formState.errors.nom && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.nom.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Descriptif *</label>
              <Textarea
                rows={4}
                placeholder="Décrivez le projet en détail..."
                {...form.register('descriptif')}
              />
              {form.formState.errors.descriptif && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.descriptif.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Ton impact *</label>
              <Textarea
                rows={4}
                placeholder="Expliquez à quoi servira le don effectué par l'utilisateur KashUP..."
                {...form.register('tonImpact')}
              />
              {form.formState.errors.tonImpact && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.tonImpact.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
              <Select {...form.register('status')}>
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingProjet(undefined);
                  form.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                {editingProjet ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingProjet(undefined);
              form.reset();
              setShowForm(true);
            }}
          >
            Créer un projet
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projetsQuery.data ?? []).map((projet) => (
          <Card key={projet.id}>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">{projet.nom}</h3>
                  <Badge tone={projet.status === 'active' ? 'success' : 'warning'}>
                    {projet.status === 'active' ? 'Actif' : 'Brouillon'}
                  </Badge>
                </div>
                <div className="mt-2 space-y-2 text-sm text-ink/70">
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink/50 mb-1">Descriptif</p>
                    <p className="line-clamp-3">{projet.descriptif}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink/50 mb-1">Ton impact</p>
                    <p className="line-clamp-3">{projet.tonImpact}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingProjet(projet);
                    setShowForm(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
                      deleteMutation.mutate(projet.id);
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

      {projetsQuery.data?.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucun projet créé</p>
        </Card>
      )}
    </div>
  );
};

