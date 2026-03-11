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
  fetchAssociations,
  createAssociation,
  updateAssociation,
  deleteAssociation,
  associationFormSchema,
} from '../api';
import type { Association } from '@/types/entities';
import type { AssociationFormInput } from '../api';

export const AssociationsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | undefined>();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const associationsQuery = useQuery({
    queryKey: ['associations'],
    queryFn: fetchAssociations,
    enabled: !showForm || !editingAssociation,
  });

  const form = useForm<AssociationFormInput>({
    resolver: zodResolver(associationFormSchema),
    defaultValues: {
      nom: '',
      type: 'solidaire',
      but: '',
      tonImpact: '',
      status: 'draft',
    },
  });

  // Mettre à jour le formulaire quand on édite
  useEffect(() => {
    if (editingAssociation) {
      form.reset({
        nom: editingAssociation.nom,
        type: editingAssociation.type || 'solidaire',
        but: editingAssociation.but,
        tonImpact: editingAssociation.tonImpact,
        status: editingAssociation.status,
      });
      setImagePreview(editingAssociation.imageUrl || null);
    } else {
      form.reset({
        nom: '',
        type: 'solidaire',
        but: '',
        tonImpact: '',
        status: 'draft',
      });
      setImagePreview(null);
    }
  }, [editingAssociation, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('image', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createMutation = useMutation({
    mutationFn: createAssociation,
    onSuccess: () => {
      toast.success('Association créée avec succès');
      form.reset();
      setImagePreview(null);
      setShowForm(false);
      setEditingAssociation(undefined);
      void queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
    onError: () => toast.error('Impossible de créer l\'association'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AssociationFormInput> }) =>
      updateAssociation(id, payload),
    onSuccess: () => {
      toast.success('Association mise à jour avec succès');
      form.reset();
      setImagePreview(null);
      setShowForm(false);
      setEditingAssociation(undefined);
      void queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
    onError: () => toast.error('Impossible de mettre à jour l\'association'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssociation,
    onSuccess: () => {
      toast.success('Association supprimée');
      void queryClient.invalidateQueries({ queryKey: ['associations'] });
    },
    onError: () => toast.error('Impossible de supprimer l\'association'),
  });

  const onSubmit = (values: AssociationFormInput) => {
    if (editingAssociation) {
      updateMutation.mutate({ id: editingAssociation.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      {showForm && (
        <Card title={editingAssociation ? 'Modifier l\'association' : 'Créer une association'}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              void form.handleSubmit(onSubmit)(event);
            }}
          >
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Nom de l'association *</label>
              <Input placeholder="Ex: Fondation Local Impact" {...form.register('nom')} />
              {form.formState.errors.nom && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.nom.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Type d'association *</label>
              <Select {...form.register('type')}>
                <option value="solidaire">Solidaire</option>
                <option value="humanitaire">Humanitaire</option>
                <option value="ecologie">Écologie</option>
                <option value="sante">Santé</option>
                <option value="education">Éducation</option>
                <option value="culture">Culture</option>
                <option value="sport">Sport</option>
                <option value="autre">Autre</option>
              </Select>
              {form.formState.errors.type && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">But de l'association *</label>
              <Textarea
                rows={4}
                placeholder="Décrivez le but et la mission de l'association..."
                {...form.register('but')}
              />
              {form.formState.errors.but && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.but.message}</p>
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
              <label className="mb-1 block text-xs uppercase text-ink/50">Image de l'association</label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {form.formState.errors.image && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.image.message}</p>
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
                  setEditingAssociation(undefined);
                  form.reset();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                {editingAssociation ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setEditingAssociation(undefined);
              form.reset();
              setShowForm(true);
            }}
          >
            Créer une association
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(associationsQuery.data ?? []).map((association) => (
          <Card key={association.id}>
            <div className="space-y-3">
              {association.imageUrl && (
                <img 
                  src={association.imageUrl} 
                  alt={association.nom} 
                  className="h-32 w-full rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-ink">{association.nom}</h3>
                    {association.type && (
                      <Badge tone="info" className="mt-1">
                        {association.type === 'solidaire' ? 'Solidaire' :
                         association.type === 'humanitaire' ? 'Humanitaire' :
                         association.type === 'ecologie' ? 'Écologie' :
                         association.type === 'sante' ? 'Santé' :
                         association.type === 'education' ? 'Éducation' :
                         association.type === 'culture' ? 'Culture' :
                         association.type === 'sport' ? 'Sport' :
                         'Autre'}
                      </Badge>
                    )}
                  </div>
                  <Badge tone={association.status === 'active' ? 'success' : 'warning'}>
                    {association.status === 'active' ? 'Actif' : 'Brouillon'}
                  </Badge>
                </div>
                <div className="mt-2 space-y-2 text-sm text-ink/70">
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink/50 mb-1">But</p>
                    <p className="line-clamp-3">{association.but}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink/50 mb-1">Ton impact</p>
                    <p className="line-clamp-3">{association.tonImpact}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingAssociation(association);
                    setShowForm(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette association ?')) {
                      deleteMutation.mutate(association.id);
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

      {associationsQuery.data?.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-sm text-ink/50">Aucune association créée</p>
        </Card>
      )}
    </div>
  );
};

