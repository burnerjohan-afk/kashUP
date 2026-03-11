import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPartners } from '@/features/partners/api';
import {
  carteUpLibreSchema,
  createCarteUpLibre,
  updateCarteUpLibre,
} from '../api-cartes-up';
import type { CarteUpLibre, CarteUpLibreInput } from '@/types/gifts';

type CarteUpLibreFormProps = {
  carte?: CarteUpLibre;
  onSuccess?: () => void;
};

export const CarteUpLibreForm = ({ carte, onSuccess }: CarteUpLibreFormProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(carte?.imageUrl || null);

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const form = useForm<CarteUpLibreInput>({
    resolver: zodResolver(carteUpLibreSchema),
    defaultValues: {
      nom: carte?.nom || '',
      description: carte?.description || '',
      montantsDisponibles: carte?.montantsDisponibles ?? [], // vide = montant libre par l'utilisateur
      partenairesEligibles: carte?.partenairesEligibles || [],
      conditions: carte?.conditions || '',
      commentCaMarche: carte?.commentCaMarche || '',
      cashbackRate: carte?.cashbackRate ?? undefined,
      status: carte?.status || 'active',
    },
  });

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
    mutationFn: createCarteUpLibre,
    onSuccess: () => {
      toast.success('Config Carte Sélection UP enregistrée');
      form.reset();
      setImagePreview(null);
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de créer la carte'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CarteUpLibreInput> }) =>
      updateCarteUpLibre(id, payload),
    onSuccess: () => {
      toast.success('Config Carte Sélection UP mise à jour');
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de mettre à jour la carte'),
  });

  const onSubmit = (values: CarteUpLibreInput) => {
    if (carte) {
      updateMutation.mutate({ id: carte.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const selectedPartners = form.watch('partenairesEligibles') || [];

  return (
    <Card title={carte ? 'Modifier la config Carte Sélection UP' : 'Configurer la Carte Sélection UP'}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
      >
        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Nom *</label>
          <Input placeholder="Ex: Config Carte Sélection UP" {...form.register('nom')} />
          {form.formState.errors.nom && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.nom.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Description *</label>
          <Textarea
            rows={3}
            placeholder="Description de la carte..."
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Image</label>
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
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Taux de cashback (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="Ex: 5"
            {...form.register('cashbackRate', { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-ink/50">Pourcentage de cashback accordé à l&apos;achat (optionnel).</p>
        </div>

        <div className="rounded-lg border border-ink/10 bg-muted/30 p-3 space-y-2">
          <p className="text-sm text-ink/80">
            <strong>Montant libre</strong> : le montant est défini par l&apos;utilisateur au moment de l&apos;achat.
          </p>
          <p className="text-sm text-ink/70">
            <strong>Macarons</strong> : l&apos;utilisateur peut choisir parmi Joyeux anniversaire, Plaisir d&apos;offrir, Bonne fête, Félicitations, Bonne fête maman/papa/mamie/papi, Joyeuse Saint-Valentin, ou pastille libre. Utilisez la carte test en bas de page pour prévisualiser le rendu.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Partenaires éligibles *</label>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-ink/10 p-3">
            {(partnersQuery.data?.partners ?? []).map((partner) => {
              const isSelected = selectedPartners.includes(partner.id);
              return (
                <label key={partner.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) => {
                      const current = form.getValues('partenairesEligibles') || [];
                      if (event.target.checked) {
                        form.setValue('partenairesEligibles', [...current, partner.id], {
                          shouldValidate: true,
                        });
                      } else {
                        form.setValue(
                          'partenairesEligibles',
                          current.filter((id) => id !== partner.id),
                          { shouldValidate: true }
                        );
                      }
                    }}
                  />
                  <span className="text-sm">{partner.name}</span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.partenairesEligibles && (
            <p className="mt-1 text-xs text-red-500">
              {form.formState.errors.partenairesEligibles.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Conditions</label>
          <Textarea rows={4} placeholder="Conditions d'utilisation..." {...form.register('conditions')} />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Comment ça marche</label>
          <Textarea
            rows={4}
            placeholder="Explication du fonctionnement..."
            {...form.register('commentCaMarche')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
          <Select {...form.register('status')}>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
            {carte ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

