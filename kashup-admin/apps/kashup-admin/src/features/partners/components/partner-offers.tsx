import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Offer } from '@/types/entities';
import { createOffer, fetchCurrentOffers, offerFormSchema } from '@/features/offers/api';
import type { OfferFormInput } from '@/features/offers/api';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils/format';
import { OfferCountdown } from '@/features/offers/components/offer-countdown';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

type PartnerOffersProps = {
  partnerId: string;
  partnerName: string;
  partnerLogoUrl?: string;
};

export const PartnerOffers = ({ partnerId, partnerName, partnerLogoUrl }: PartnerOffersProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const offersQuery = useQuery({
    queryKey: ['offers', partnerId],
    queryFn: () => fetchCurrentOffers(),
    select: (offers) => offers.filter((offer) => offer.partnerId === partnerId),
  });

  const offerForm = useForm<OfferFormInput>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      partnerId,
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

  const offers = offersQuery.data ?? [];

  return (
    <Card title="Offres du moment" description="Gérer les offres de ce partenaire">
      <div className="space-y-6">
        {/* Formulaire de création d'offre */}
        <div className="rounded-lg border border-ink/10 bg-ink/2 p-4">
          <h4 className="mb-4 text-sm font-semibold text-primary">Créer une nouvelle offre</h4>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              void offerForm.handleSubmit(onOfferSubmit)(event);
            }}
          >
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Titre de l'offre *</label>
              <Input placeholder="Ex: Menu déjeuner à 25€" {...offerForm.register('title')} />
              {offerForm.formState.errors.title && (
                <p className="mt-1 text-xs text-red-500">{offerForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Prix (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...offerForm.register('price', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Taux cashback (%) *</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="5.0"
                  {...offerForm.register('cashbackRate', { valueAsNumber: true })}
                />
                {offerForm.formState.errors.cashbackRate && (
                  <p className="mt-1 text-xs text-red-500">{offerForm.formState.errors.cashbackRate.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de début *</label>
                <Input type="datetime-local" {...offerForm.register('startAt')} />
                {offerForm.formState.errors.startAt && (
                  <p className="mt-1 text-xs text-red-500">{offerForm.formState.errors.startAt.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de fin *</label>
                <Input type="datetime-local" {...offerForm.register('endAt')} />
                {offerForm.formState.errors.endAt && (
                  <p className="mt-1 text-xs text-red-500">{offerForm.formState.errors.endAt.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Stock (nombre d'offres disponibles) *</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="50"
                  {...offerForm.register('stock', { valueAsNumber: true })}
                />
                {offerForm.formState.errors.stock && (
                  <p className="mt-1 text-xs text-red-500">{offerForm.formState.errors.stock.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Image de l'offre</label>
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
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={createOfferMutation.isPending}>
                Créer l'offre
              </Button>
            </div>
          </form>
        </div>

        {/* Liste des offres existantes */}
        {offers.length > 0 && (
          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">Offres existantes</h4>
            <div className="space-y-3">
              {offers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} partnerLogoUrl={partnerLogoUrl} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const OfferRow = ({ offer, partnerLogoUrl }: { offer: Offer; partnerLogoUrl?: string }) => {
  const stockRemaining = offer.stock - offer.stockUsed;
  const stockPercentage = offer.stock > 0 ? (stockRemaining / offer.stock) * 100 : 0;

  return (
    <div className="rounded-lg border border-ink/10 p-4">
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
        {partnerLogoUrl && !offer.imageUrl && (
          <img 
            src={normalizeImageUrl(partnerLogoUrl) ?? partnerLogoUrl} 
            alt="Partenaire" 
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
              <p className="text-xs text-ink/50">
                {formatDate(offer.startAt)} → {formatDate(offer.endAt)}
              </p>
            </div>
            <Badge tone={offer.status === 'active' ? 'success' : 'warning'}>
              {offer.status === 'active' ? 'Active' : offer.status === 'scheduled' ? 'Planifiée' : 'Expirée'}
            </Badge>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex gap-4 text-sm text-ink/70">
              {offer.price && <span>Prix: {formatCurrency(offer.price)}</span>}
              <span>Cashback: {formatPercent(offer.cashbackRate / 100)}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-ink/70">
                Stock: <span className="font-semibold text-ink">{stockRemaining}</span>/{offer.stock}
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
        </div>
      </div>
    </div>
  );
};

