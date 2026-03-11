import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Conditions } from '@/components/conditions';
import { useRef, useState } from 'react';
import type { Reward } from '@/types/entities';
import {
  rewardFormSchema,
  createReward,
  updateReward,
  PARTNER_CATEGORIES,
  USER_TYPES,
  CHALLENGE_CATEGORIES,
} from '../api';
import type { RewardFormInput } from '../api';
import { fetchPartners } from '@/features/partners/api';

type RewardFormProps = {
  type: 'boost' | 'badge' | 'lottery' | 'challenge';
  reward?: Reward;
  onSuccess?: () => void;
};

export const RewardForm = ({ type, reward, onSuccess }: RewardFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(reward?.imageUrl || null);
  const [partnerFilterType, setPartnerFilterType] = useState<'specific' | 'category'>(
    reward?.partnerId ? 'specific' : reward?.partnerCategoryFilter ? 'category' : 'category',
  );

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
    enabled:
      (type === 'boost' && partnerFilterType === 'specific') || type === 'lottery' || type === 'challenge',
  });

  // Valeurs par défaut pour la création d'une loterie (évite validation API)
  const lotteryDateDefaults =
    type === 'lottery' && !reward
      ? (() => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setMonth(end.getMonth() + 1);
          return { start: start.toISOString().slice(0, 16), end: end.toISOString().slice(0, 16) };
        })()
      : null;

  const form = useForm<RewardFormInput>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: {
      type,
      title: reward?.title || '',
      duration: reward?.duration || 7,
      stock: type === 'badge' ? undefined : reward?.stock || 100,
      boostRate: reward?.boostRate || 0,
      status: reward?.status || 'draft',
      // Champs badges
      transactionCount: reward?.transactionCount,
      partnerCategory: reward?.partnerCategory,
      // Champs boosts
      partnerId: reward?.partnerId,
      partnerCategoryFilter: reward?.partnerCategoryFilter,
      userType: reward?.userType || 'Tous',
      // Champs loteries
      partnerIds: reward?.partnerIds || [],
      startAt: lotteryDateDefaults
        ? lotteryDateDefaults.start
        : (reward?.startAt ?? reward?.startsAt)
          ? new Date((reward?.startAt ?? reward?.startsAt) as string).toISOString().slice(0, 16)
          : '',
      endAt: lotteryDateDefaults
        ? lotteryDateDefaults.end
        : (reward?.endAt ?? reward?.endsAt)
          ? new Date((reward?.endAt ?? reward?.endsAt) as string).toISOString().slice(0, 16)
          : '',
      drawDate: reward?.drawDate
        ? new Date(reward.drawDate).toISOString().slice(0, 16)
        : lotteryDateDefaults ? lotteryDateDefaults.end : '',
      pointsRequired: reward?.pointsRequired ?? (type === 'lottery' ? 100 : undefined),
      maxTicketsPerUser: reward?.maxTicketsPerUser ?? null,
      totalTicketsAvailable: reward?.totalTicketsAvailable ?? null,
      isTicketStockLimited: reward?.isTicketStockLimited ?? false,
      showOnHome: reward?.showOnHome ?? true,
      showOnRewards: reward?.showOnRewards ?? true,
      prizeTitle: reward?.prizeTitle || '',
      prizeDescription: reward?.prizeDescription || '',
      prizeType: reward?.prizeType || '',
      prizeValue: reward?.prizeValue,
      prizeCurrency: reward?.prizeCurrency || 'EUR',
      shortDescription: reward?.shortDescription || '',
      rules: reward?.rules || '',
      imageUrl: reward?.imageUrl ?? '',
      // Champs défis
      category: reward?.category || '',
      challengePartnerCategory: reward?.challengePartnerCategory,
      challengePartnerIds: reward?.challengePartnerIds || [],
      challengeStartAt: (reward?.challengeStartAt ?? reward?.startAt)
        ? new Date((reward?.challengeStartAt ?? reward?.startAt) as string).toISOString().slice(0, 16)
        : '',
      challengeEndAt: (reward?.challengeEndAt ?? reward?.endAt)
        ? new Date((reward?.challengeEndAt ?? reward?.endAt) as string).toISOString().slice(0, 16)
        : '',
      challengeTransactionCount: reward?.challengeTransactionCount ?? reward?.goalValue,
      challengeRewardPoints: reward?.challengeRewardPoints ?? reward?.rewardPoints ?? 0,
      // Champ commun pour les conditions
      conditions: reward?.conditions || '',
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
    mutationFn: createReward,
    onSuccess: () => {
      toast.success('Récompense créée');
      form.reset();
      setImagePreview(null);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Impossible de créer la récompense';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<RewardFormInput> }) =>
      updateReward(id, payload),
    onSuccess: () => {
      toast.success('Récompense mise à jour');
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour la récompense';
      toast.error(message);
    },
  });

  const onSubmit = (values: RewardFormInput) => {
    // Convertir les dates datetime-local en ISO pour l'API
    const payload = { ...values };
    // Fallback : récupérer l'image depuis l'input file si absente des values (loteries, etc.)
    const fileFromInput = fileInputRef.current?.files?.[0];
    if (fileFromInput instanceof File && !(payload.image instanceof File)) {
      payload.image = fileFromInput;
    }
    if (payload.startAt) {
      payload.startAt = new Date(payload.startAt).toISOString();
    }
    if (payload.endAt) {
      payload.endAt = new Date(payload.endAt).toISOString();
    }
    if (payload.drawDate) {
      payload.drawDate = new Date(payload.drawDate).toISOString();
    }
    if (payload.challengeStartAt) {
      payload.challengeStartAt = new Date(payload.challengeStartAt).toISOString();
    }
    if (payload.challengeEndAt) {
      payload.challengeEndAt = new Date(payload.challengeEndAt).toISOString();
    }

    payload.type = type;
    if (reward) {
      updateMutation.mutate({ id: reward.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const typeLabels = {
    boost: 'Boost',
    badge: 'Badge',
    lottery: 'Loterie',
    challenge: 'Défi',
  };

  return (
    <Card title={reward ? `Modifier ${typeLabels[type]}` : `Créer un ${typeLabels[type]}`}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
      >
        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Nom *</label>
          <Input placeholder="Ex: Boost week-end spécial" {...form.register('title')} />
          {form.formState.errors.title && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Durée (jours) *</label>
            <Input
              type="number"
              min="1"
              placeholder="7"
              {...form.register('duration', { valueAsNumber: true })}
            />
            {form.formState.errors.duration && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.duration.message}</p>
            )}
          </div>
          {type !== 'badge' && (
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Quantité (stock) *</label>
              <Input
                type="number"
                min="1"
                placeholder="100"
                {...form.register('stock', { valueAsNumber: true })}
              />
              {form.formState.errors.stock && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.stock.message}</p>
              )}
            </div>
          )}
        </div>

        {/* Champs spécifiques aux badges */}
        {type === 'badge' && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Nombre de transactions requis *
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="10"
                  {...form.register('transactionCount', { valueAsNumber: true })}
                />
                {form.formState.errors.transactionCount && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.transactionCount.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Type de partenaires *
                </label>
                <Select {...form.register('partnerCategory')}>
                  <option value="">Sélectionner un type</option>
                  {PARTNER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
                {form.formState.errors.partnerCategory && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.partnerCategory.message}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Champs spécifiques aux boosts */}
        {type === 'boost' && (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Taux de boost (%)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="0.0"
                {...form.register('boostRate', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Filtre partenaires *
              </label>
              <div className="mb-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="category"
                    checked={partnerFilterType === 'category'}
                    onChange={() => {
                      setPartnerFilterType('category');
                      form.setValue('partnerId', undefined);
                    }}
                  />
                  <span className="text-sm">Typologie de partenaires</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="specific"
                    checked={partnerFilterType === 'specific'}
                    onChange={() => {
                      setPartnerFilterType('specific');
                      form.setValue('partnerCategoryFilter', undefined);
                    }}
                  />
                  <span className="text-sm">Partenaire spécifique</span>
                </label>
              </div>
              {partnerFilterType === 'category' ? (
                <Select {...form.register('partnerCategoryFilter')}>
                  <option value="">Sélectionner un type</option>
                  {PARTNER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select {...form.register('partnerId')}>
                  <option value="">Sélectionner un partenaire</option>
                  {(partnersQuery.data?.partners ?? []).map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </Select>
              )}
              {form.formState.errors.partnerId && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.partnerId.message}</p>
              )}
              {form.formState.errors.partnerCategoryFilter && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.partnerCategoryFilter.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Typologie d'utilisateurs
              </label>
              <Select {...form.register('userType')}>
                {USER_TYPES.map((userType) => (
                  <option key={userType} value={userType}>
                    {userType}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {/* Champs spécifiques aux loteries */}
        {type === 'lottery' && (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Partenaires de la loterie *
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-ink/10 p-3">
                {(partnersQuery.data?.partners ?? []).map((partner) => {
                  const selectedPartnerIds = form.watch('partnerIds') || [];
                  const isSelected = selectedPartnerIds.includes(partner.id);
                  return (
                    <label key={partner.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => {
                          const currentIds = form.getValues('partnerIds') || [];
                          if (event.target.checked) {
                            form.setValue('partnerIds', [...currentIds, partner.id]);
                          } else {
                            form.setValue(
                              'partnerIds',
                              currentIds.filter((id) => id !== partner.id),
                            );
                          }
                        }}
                      />
                      <span className="text-sm">{partner.name}</span>
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.partnerIds && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.partnerIds.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de début *</label>
                <Input
                  type="datetime-local"
                  {...form.register('startAt')}
                />
                {form.formState.errors.startAt && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.startAt.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de fin *</label>
                <Input
                  type="datetime-local"
                  {...form.register('endAt')}
                />
                {form.formState.errors.endAt && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.endAt.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date du tirage</label>
                <Input
                  type="datetime-local"
                  {...form.register('drawDate')}
                />
                <p className="mt-1 text-xs text-ink/50">Si vide, la date de fin sera utilisée pour le tirage.</p>
              </div>
            </div>

            <div className="rounded-lg border border-ink/10 bg-ink/5 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase text-ink/70">Lots / Dotation</h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase text-ink/50">Titre du lot *</label>
                  <Input
                    placeholder="Ex: Chèque 50€, Bon d&#39;achat, etc."
                    {...form.register('prizeTitle')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-ink/50">Description du lot</label>
                  <Textarea
                    rows={3}
                    placeholder="Décrivez le lot à gagner..."
                    {...form.register('prizeDescription')}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase text-ink/50">Valeur (optionnel)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ex: 50"
                      {...form.register('prizeValue', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-ink/50">Devise</label>
                    <Select {...form.register('prizeCurrency')}>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="">—</option>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase text-ink/50">Nombre total de tickets (optionnel)</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Illimité si vide"
                    {...form.register('totalTicketsAvailable', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v) })}
                  />
                  <p className="mt-1 text-xs text-ink/50">Limiter le nombre de tickets en vente. Vide = illimité.</p>
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('showOnHome')}
                      className="rounded border-ink/30"
                    />
                    <span className="text-sm">Afficher sur l&#39;accueil</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...form.register('showOnRewards')}
                      className="rounded border-ink/30"
                    />
                    <span className="text-sm">Afficher dans l&#39;onglet Récompenses</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Points requis pour participer *
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  {...form.register('pointsRequired', { valueAsNumber: true })}
                />
                {form.formState.errors.pointsRequired && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.pointsRequired.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Tickets max par utilisateur
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Illimité"
                    disabled={form.watch('maxTicketsPerUser') === null}
                    {...form.register('maxTicketsPerUser', {
                      valueAsNumber: true,
                      setValueAs: (value) => {
                        if (value === '' || value === null) return null;
                        return Number(value);
                      },
                    })}
                  />
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={form.watch('maxTicketsPerUser') === null}
                      onChange={(event) => {
                        if (event.target.checked) {
                          form.setValue('maxTicketsPerUser', null);
                        } else {
                          form.setValue('maxTicketsPerUser', 1);
                        }
                      }}
                    />
                    <span className="text-sm">Illimité</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Règlement de la loterie</label>
              <Textarea
                rows={6}
                placeholder="Règles et conditions de la loterie..."
                {...form.register('rules')}
              />
            </div>
          </>
        )}

        {/* Champs spécifiques aux défis */}
        {type === 'challenge' && (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Catégorie (menu Badges & points)
              </label>
              <Select {...form.register('category')}>
                {CHALLENGE_CATEGORIES.map((opt) => (
                  <option key={opt.value || 'empty'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-ink/50">
                Détermine l’onglet dans l’app (Consentements, Parrainages, Cagnotte, etc.). Vide = dérivé du type.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Typologie de partenaires
              </label>
              <Select {...form.register('challengePartnerCategory')}>
                <option value="">Sélectionner un type (optionnel)</option>
                {PARTNER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">
                Partenaires du défi *
              </label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-ink/10 p-3">
                {(partnersQuery.data?.partners ?? []).map((partner) => {
                  const selectedPartnerIds = form.watch('challengePartnerIds') || [];
                  const isSelected = selectedPartnerIds.includes(partner.id);
                  return (
                    <label key={partner.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => {
                          const currentIds = form.getValues('challengePartnerIds') || [];
                          if (event.target.checked) {
                            form.setValue('challengePartnerIds', [...currentIds, partner.id]);
                          } else {
                            form.setValue(
                              'challengePartnerIds',
                              currentIds.filter((id) => id !== partner.id),
                            );
                          }
                        }}
                      />
                      <span className="text-sm">{partner.name}</span>
                    </label>
                  );
                })}
              </div>
              {form.formState.errors.challengePartnerIds && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.challengePartnerIds.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de début *</label>
                <Input
                  type="datetime-local"
                  {...form.register('challengeStartAt')}
                />
                {form.formState.errors.challengeStartAt && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.challengeStartAt.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Date de fin *</label>
                <Input
                  type="datetime-local"
                  {...form.register('challengeEndAt')}
                />
                {form.formState.errors.challengeEndAt && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.challengeEndAt.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Nombre de transactions requis (optionnel)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 10"
                  {...form.register('challengeTransactionCount', { valueAsNumber: true })}
                />
                {form.formState.errors.challengeTransactionCount && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.challengeTransactionCount.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink/50">
                  Objectif à atteindre (ex: 3 achats). Vide ou 0 = pas de critère de nombre.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">
                  Points gagnés à la réussite du défi *
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="50"
                  {...form.register('challengeRewardPoints', { valueAsNumber: true })}
                />
                {form.formState.errors.challengeRewardPoints && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.challengeRewardPoints.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink/50">
                  Nombre de points crédités à l’utilisateur quand il valide le défi.
                </p>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
          <Select {...form.register('status')}>
            <option value="draft">Brouillon</option>
            <option value="active">Actif</option>
            <option value="archived">Archivé</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Image</label>
          <Input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-full rounded-lg object-cover" />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Les conditions</label>
          <Textarea
            rows={4}
            placeholder="Conditions générales de la récompense..."
            {...form.register('conditions')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
            {reward ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
