import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Offer } from '@/types/entities';
import { createOffer, updateOffer, fetchOffers, offerFormSchema } from '../api';
import type { OfferFormInput } from '../api';
import { fetchPartners } from '@/features/partners/api';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils/format';
import { OfferCountdown } from '../components/offer-countdown';
import { HowItWorks } from '@/components/how-it-works';
import { Conditions } from '@/components/conditions';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

export const OffersPage = () => {
  const [filters, setFilters] = useState({ status: 'all' });

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const offersQuery = useQuery({
    queryKey: ['offers', filters],
    queryFn: () => fetchOffers(filters.status as 'all' | 'active' | 'scheduled' | 'expired'),
    refetchInterval: 60_000,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const offerForm = useForm<OfferFormInput>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      partnerId: '',
      title: '',
      price: undefined,
      cashbackRate: 5,
      startAt: '',
      endAt: '',
      stock: 50,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      offerForm.setValue('image', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createOfferMutation = useMutation({
    mutationFn: createOffer,
    onSuccess: () => {
      toast.success('Offre créée avec succès');
      void offersQuery.refetch();
      offerForm.reset();
      setImagePreview(null);
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de créer l\'offre';
      toast.error(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ Erreur complète lors de la création de l\'offre:', error);
      }
    },
  });

  const onOfferSubmit = (values: OfferFormInput) => void createOfferMutation.mutate(values);

  return (
    <div className="space-y-6">
      <HowItWorks
        content="Les offres sont des promotions temporaires proposées par les partenaires. Elles peuvent avoir un prix, un taux de cashback, une date de début et de fin, et un stock limité. Les utilisateurs peuvent acheter ces offres et bénéficier du cashback associé. Chaque offre a un compteur qui diminue à mesure que les offres sont validées."
      />

      <Card title="Offres en cours" description="Scheduling, capping, règles cashback">
        <div className="mb-4">
          <Select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="scheduled">Planifiées</option>
            <option value="expired">Expirées</option>
          </Select>
        </div>

        <div className="space-y-3">
          {(offersQuery.data ?? []).map((offer) => (
              <OfferRow 
                key={offer.id} 
                offer={offer} 
                partners={partnersQuery.data?.partners ?? []}
                onUpdate={() => void offersQuery.refetch()}
              />
            ))}
        </div>
      </Card>

      <Card title="Planifier une offre" description="Créer une nouvelle offre">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            void offerForm.handleSubmit(onOfferSubmit)(event);
          }}
        >
          <Select {...offerForm.register('partnerId')}>
            <option value="">Sélectionner un partenaire</option>
            {(partnersQuery.data?.partners ?? []).map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
          <Input placeholder="Titre" {...offerForm.register('title')} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix (€)"
              {...offerForm.register('price', { valueAsNumber: true })}
            />
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="Taux cashback (%)"
              {...offerForm.register('cashbackRate', { valueAsNumber: true })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="datetime-local" {...offerForm.register('startAt')} />
            <Input type="datetime-local" {...offerForm.register('endAt')} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              min="1"
              placeholder="Stock (nombre d'offres disponibles)"
              {...offerForm.register('stock', { valueAsNumber: true })}
            />
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Image de l'offre</label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-full rounded-lg object-cover" />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Les conditions</label>
              <textarea
                className="w-full rounded-lg border border-ink/10 bg-ink/2 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-primary focus:outline-none"
                rows={4}
                placeholder="Conditions générales de l'offre..."
                {...offerForm.register('conditions')}
              />
            </div>
          </div>
          <Button type="submit" isLoading={createOfferMutation.isPending}>
            Programmer
          </Button>
        </form>
      </Card>
    </div>
  );
};

type OfferRowProps = {
  offer: Offer;
  partners: Array<{ id: string; name: string }>;
  onUpdate: () => void;
};

const OfferRow = ({ offer, partners, onUpdate }: OfferRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(offer.imageUrl || null);

  const stockRemaining = (offer.stock ?? 0) - (offer.stockUsed ?? 0);
  const stockPercentage = offer.stock > 0 ? (stockRemaining / offer.stock) * 100 : 0;

  const editForm = useForm<OfferFormInput>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      partnerId: offer.partnerId,
      title: offer.title,
      price: offer.price,
      cashbackRate: offer.cashbackRate,
      startAt: offer.startAt ? new Date(offer.startAt).toISOString().slice(0, 16) : '',
      endAt: offer.endAt ? new Date(offer.endAt).toISOString().slice(0, 16) : '',
      stock: offer.stock ?? 50,
      conditions: offer.conditions,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      editForm.setValue('image', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateOfferMutation = useMutation({
    mutationFn: (values: OfferFormInput) => updateOffer(offer.id, values),
    onSuccess: () => {
      toast.success('Offre modifiée avec succès');
      setIsEditing(false);
      onUpdate();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Impossible de modifier l\'offre';
      toast.error(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('❌ Erreur complète lors de la modification de l\'offre:', error);
      }
    },
  });

  const onEditSubmit = (values: OfferFormInput) => {
    // IMPORTANT: S'assurer que tous les champs requis sont présents
    // Même si certains n'ont pas été modifiés, ils doivent être envoyés lors d'une mise à jour avec image
    const payload: OfferFormInput = {
      partnerId: values.partnerId || offer.partnerId,
      title: values.title || offer.title,
      cashbackRate: values.cashbackRate ?? offer.cashbackRate,
      startAt: values.startAt || (offer.startAt ? new Date(offer.startAt).toISOString().slice(0, 16) : ''),
      endAt: values.endAt || (offer.endAt ? new Date(offer.endAt).toISOString().slice(0, 16) : ''),
      stock: values.stock ?? offer.stock ?? 50,
      price: values.price !== undefined ? values.price : offer.price,
      conditions: values.conditions !== undefined ? values.conditions : offer.conditions,
      image: values.image, // Peut être undefined si aucune nouvelle image n'est sélectionnée
    };

    if (import.meta.env.DEV) {
      console.log('📋 Données du formulaire avant envoi:', {
        originalValues: values,
        payload,
        hasImage: !!payload.image,
        imageType: payload.image instanceof File ? payload.image.type : typeof payload.image,
      });
    }

    void updateOfferMutation.mutate(payload);
  };

  const handleCancel = () => {
    setIsEditing(false);
    editForm.reset();
    setImagePreview(offer.imageUrl || null);
  };

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <h4 className="mb-4 text-sm font-semibold text-primary">Modifier l'offre</h4>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            void editForm.handleSubmit(onEditSubmit)(event);
          }}
        >
          <Select {...editForm.register('partnerId')}>
            <option value="">Sélectionner un partenaire</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
          {editForm.formState.errors.partnerId && (
            <p className="text-xs text-warning">{editForm.formState.errors.partnerId.message}</p>
          )}

          <Input placeholder="Titre" {...editForm.register('title')} />
          {editForm.formState.errors.title && (
            <p className="text-xs text-warning">{editForm.formState.errors.title.message}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Prix (€)"
              {...editForm.register('price', { valueAsNumber: true })}
            />
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="Taux cashback (%)"
              {...editForm.register('cashbackRate', { valueAsNumber: true })}
            />
          </div>
          {editForm.formState.errors.cashbackRate && (
            <p className="text-xs text-warning">{editForm.formState.errors.cashbackRate.message}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Input type="datetime-local" {...editForm.register('startAt')} />
            <Input type="datetime-local" {...editForm.register('endAt')} />
          </div>
          {editForm.formState.errors.endAt && (
            <p className="text-xs text-warning">{editForm.formState.errors.endAt.message}</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              min="1"
              placeholder="Stock (nombre d'offres disponibles)"
              {...editForm.register('stock', { valueAsNumber: true })}
            />
            {editForm.formState.errors.stock && (
              <p className="text-xs text-warning">{editForm.formState.errors.stock.message}</p>
            )}
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Image de l'offre</label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-full rounded-lg object-cover" />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs uppercase text-ink/50">Les conditions</label>
              <textarea
                className="w-full rounded-lg border border-ink/10 bg-ink/2 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-primary focus:outline-none"
                rows={4}
                placeholder="Conditions générales de l'offre..."
                {...editForm.register('conditions')}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" isLoading={updateOfferMutation.isPending}>
              Enregistrer les modifications
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/5 p-4">
      <div className="flex items-start gap-4">
        {offer.imageUrl && (
          <img
            src={normalizeImageUrl(offer.imageUrl) ?? offer.imageUrl}
            alt={offer.title}
            className="h-20 w-20 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {offer.partnerLogoUrl && !offer.imageUrl && (
          <img
            src={normalizeImageUrl(offer.partnerLogoUrl) ?? offer.partnerLogoUrl}
            alt={offer.partnerName || 'Partenaire'}
            className="h-20 w-20 rounded-lg object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">{offer.title}</p>
              {offer.partnerName && (
                <p className="text-xs text-ink/50">{offer.partnerName}</p>
              )}
              <p className="text-xs text-ink/50">
                {formatDate(offer.startAt)} → {formatDate(offer.endAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={offer.status === 'active' ? 'success' : 'warning'}>
                {offer.status === 'active' ? 'Active' : offer.status === 'scheduled' ? 'Planifiée' : 'Expirée'}
              </Badge>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                className="text-xs px-3 py-1"
              >
                ✏️ Modifier
              </Button>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex gap-4 text-sm text-ink/70">
              {offer.price && <span>Prix: {formatCurrency(offer.price)}</span>}
              <span>Cashback: {formatPercent(offer.cashbackRate / 100)}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-ink/70">
                Stock: <span className="font-semibold text-ink">{stockRemaining}</span>/{offer.stock ?? 0}
              </span>
              <div className="flex-1 max-w-xs">
                <div className="h-2 w-full rounded-full bg-ink/10">
                  <div
                    className={`h-2 rounded-full ${
                      stockPercentage > 50 ? 'bg-green-500' : stockPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stockPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            {offer.status === 'active' && <OfferCountdown endAt={offer.endAt} />}
          </div>
          {offer.conditions && (
            <div className="mt-3">
              <Conditions conditions={offer.conditions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
