import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils/cn';
import { HowItWorks } from '@/components/how-it-works';
import { Conditions } from '@/components/conditions';
import {
  fetchGiftCardConfig,
  updateGiftCardConfig,
  fetchBoxUpConfig,
  createOrUpdateBoxUpConfig,
  giftCardConfigSchema,
  boxUpConfigSchema,
  type GiftCardConfigInput,
  type BoxUpConfigInput,
  type GiftCardConfig,
  type BoxUpConfig,
} from '../api';
import { fetchPartners } from '@/features/partners/api';
import type { Partner } from '@/types/entities';

export const GiftCardsConfig = () => {
  const [activeTab, setActiveTab] = useState<'gift-card' | 'box-up'>('gift-card');
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="border-b border-ink/10">
        <nav className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('gift-card')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'gift-card'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Carte cadeau
          </button>
          <button
            onClick={() => setActiveTab('box-up')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'box-up'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Box UP
          </button>
        </nav>
      </div>

      {activeTab === 'gift-card' && <GiftCardConfigTab />}
      {activeTab === 'box-up' && <BoxUpConfigTab />}
    </div>
  );
};

const GiftCardConfigTab = () => {
  const queryClient = useQueryClient();
  const [giftCardImagePreview, setGiftCardImagePreview] = useState<string | null>(null);
  const [virtualCardImagePreview, setVirtualCardImagePreview] = useState<string | null>(null);
  const [isEditingHowItWorks, setIsEditingHowItWorks] = useState(false);
  const [isEditingConditions, setIsEditingConditions] = useState(false);

  const defaultHowItWorks = `Les cartes cadeaux sont des bons d'achat que les utilisateurs peuvent acheter avec leurs points. Chaque carte cadeau est associée à un partenaire et a une valeur fixe. Les utilisateurs peuvent commander plusieurs cartes cadeaux et les codes sont générés automatiquement. Les cartes cadeaux peuvent être envoyées par email à un bénéficiaire.`;

  const defaultConditions = `Les cartes cadeaux sont valables pendant 12 mois à compter de la date d'achat. Elles ne sont pas remboursables et ne peuvent pas être échangées contre de l'argent. Les cartes cadeaux peuvent être utilisées uniquement chez le partenaire indiqué. En cas de perte ou de vol, aucune remise ne sera effectuée.`;

  const configQuery = useQuery({
    queryKey: ['gift-card-config'],
    queryFn: fetchGiftCardConfig,
  });

  const updateMutation = useMutation({
    mutationFn: updateGiftCardConfig,
    onSuccess: () => {
      toast.success('Configuration des cartes cadeaux mise à jour');
      void queryClient.invalidateQueries({ queryKey: ['gift-card-config'] });
    },
    onError: () => toast.error('Impossible de mettre à jour la configuration'),
  });

  const form = useForm<GiftCardConfigInput>({
    resolver: zodResolver(giftCardConfigSchema),
    defaultValues: {
      giftCardDescription: configQuery.data?.giftCardDescription || '',
      giftCardHowItWorks: configQuery.data?.giftCardHowItWorks || defaultHowItWorks,
      giftCardConditions: configQuery.data?.giftCardConditions || defaultConditions,
    },
  });

  // Mettre à jour les valeurs par défaut quand les données sont chargées
  useEffect(() => {
    if (configQuery.data) {
      form.reset({
        giftCardDescription: configQuery.data.giftCardDescription || '',
        giftCardHowItWorks: configQuery.data.giftCardHowItWorks || defaultHowItWorks,
        giftCardConditions: configQuery.data.giftCardConditions || defaultConditions,
      });
      if (configQuery.data.giftCardImageUrl) {
        setGiftCardImagePreview(configQuery.data.giftCardImageUrl);
      }
      if (configQuery.data.giftCardVirtualCardImageUrl) {
        setVirtualCardImagePreview(configQuery.data.giftCardVirtualCardImageUrl);
      }
    } else {
      // Si pas de données, utiliser les valeurs par défaut
      form.reset({
        giftCardDescription: '',
        giftCardHowItWorks: defaultHowItWorks,
        giftCardConditions: defaultConditions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configQuery.data]);

  const handleGiftCardImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('giftCardImage', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVirtualCardImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('giftCardVirtualCardImage', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setVirtualCardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (values: GiftCardConfigInput) => {
    updateMutation.mutate(values);
  };

  if (configQuery.isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card title="Configuration des cartes cadeaux">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Description du cadeau</label>
            <Textarea {...form.register('giftCardDescription')} rows={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Image pour le cadeau</label>
              <Input type="file" accept="image/*" onChange={handleGiftCardImageChange} />
              {giftCardImagePreview && (
                <img
                  src={giftCardImagePreview}
                  alt="Gift card preview"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
              {configQuery.data?.giftCardImageUrl && !giftCardImagePreview && (
                <img
                  src={configQuery.data.giftCardImageUrl}
                  alt="Current gift card"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Image carte virtuelle cadeau</label>
              <Input type="file" accept="image/*" onChange={handleVirtualCardImageChange} />
              {virtualCardImagePreview && (
                <img
                  src={virtualCardImagePreview}
                  alt="Virtual card preview"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
              {configQuery.data?.giftCardVirtualCardImageUrl && !virtualCardImagePreview && (
                <img
                  src={configQuery.data.giftCardVirtualCardImageUrl}
                  alt="Current virtual card"
                  className="mt-2 h-32 w-full rounded-lg object-cover"
                />
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs uppercase text-ink/50">Comment ça marche</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingHowItWorks(!isEditingHowItWorks)}
              >
                {isEditingHowItWorks ? 'Masquer' : 'Modifier'}
              </Button>
            </div>
            {isEditingHowItWorks ? (
              <Textarea {...form.register('giftCardHowItWorks')} rows={4} />
            ) : (
              <div className="rounded-lg border border-ink/10 bg-ink/5 p-4">
                <p className="text-sm text-ink/70 whitespace-pre-line">
                  {form.watch('giftCardHowItWorks') || defaultHowItWorks}
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs uppercase text-ink/50">Conditions</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingConditions(!isEditingConditions)}
              >
                {isEditingConditions ? 'Masquer' : 'Modifier'}
              </Button>
            </div>
            {isEditingConditions ? (
              <Textarea {...form.register('giftCardConditions')} rows={4} />
            ) : (
              <div className="rounded-lg border border-ink/10 bg-ink/5 p-4">
                <p className="text-sm text-ink/70 whitespace-pre-line">
                  {form.watch('giftCardConditions') || defaultConditions}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <HowItWorks content={form.watch('giftCardHowItWorks') || defaultHowItWorks} />

      <Conditions conditions={form.watch('giftCardConditions') || defaultConditions} />

      <div className="flex justify-end">
        <Button type="submit" isLoading={updateMutation.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
};

const BoxUpConfigTab = () => {
  const queryClient = useQueryClient();
  const [boxUpImagePreview, setBoxUpImagePreview] = useState<string | null>(null);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [isEditingHowItWorks, setIsEditingHowItWorks] = useState(false);
  const [isEditingConditions, setIsEditingConditions] = useState(false);

  const defaultHowItWorks = `Les Box UP sont des coffrets cadeaux contenant plusieurs produits ou services de différents partenaires. Les utilisateurs peuvent acheter une Box UP avec leurs points et recevoir un coffret contenant des bons d'achat ou des produits de plusieurs partenaires sélectionnés.`;

  const defaultConditions = `Les Box UP sont valables pendant 12 mois à compter de la date d'achat. Elles ne sont pas remboursables et ne peuvent pas être échangées contre de l'argent. Les Box UP contiennent des produits ou services de plusieurs partenaires. En cas de perte ou de vol, aucune remise ne sera effectuée.`;

  const configQuery = useQuery({
    queryKey: ['box-up-config'],
    queryFn: fetchBoxUpConfig,
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', {}],
    queryFn: () => fetchPartners({}),
  });

  const updateMutation = useMutation({
    mutationFn: createOrUpdateBoxUpConfig,
    onSuccess: () => {
      toast.success('Configuration Box UP mise à jour');
      void queryClient.invalidateQueries({ queryKey: ['box-up-config'] });
    },
    onError: () => toast.error('Impossible de mettre à jour la configuration'),
  });

  const form = useForm<BoxUpConfigInput>({
    resolver: zodResolver(boxUpConfigSchema),
    defaultValues: {
      boxUpName: configQuery.data?.boxUpName || '',
      boxUpPartners: configQuery.data?.boxUpPartners || [],
      boxUpHowItWorks: configQuery.data?.boxUpHowItWorks || defaultHowItWorks,
      boxUpConditions: configQuery.data?.boxUpConditions || defaultConditions,
    },
  });

  // Mettre à jour les valeurs par défaut quand les données sont chargées
  useEffect(() => {
    if (configQuery.data) {
      const partners = configQuery.data.boxUpPartners || [];
      form.reset({
        boxUpName: configQuery.data.boxUpName || '',
        boxUpPartners: partners,
        boxUpHowItWorks: configQuery.data.boxUpHowItWorks || defaultHowItWorks,
        boxUpConditions: configQuery.data.boxUpConditions || defaultConditions,
      });
      setSelectedPartners(partners);
      if (configQuery.data.boxUpImageUrl) {
        setBoxUpImagePreview(configQuery.data.boxUpImageUrl);
      }
    } else {
      // Si pas de données, utiliser les valeurs par défaut
      form.reset({
        boxUpName: '',
        boxUpPartners: [],
        boxUpHowItWorks: defaultHowItWorks,
        boxUpConditions: defaultConditions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configQuery.data]);

  const handleBoxUpImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('boxUpImage', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setBoxUpImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePartner = (partnerId: string) => {
    const current = form.getValues('boxUpPartners') || [];
    const newPartners = current.includes(partnerId)
      ? current.filter((id) => id !== partnerId)
      : [...current, partnerId];
    form.setValue('boxUpPartners', newPartners, { shouldValidate: true });
    setSelectedPartners(newPartners);
  };

  const onSubmit = (values: BoxUpConfigInput) => {
    updateMutation.mutate(values);
  };

  if (configQuery.isLoading || partnersQuery.isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card title="Configuration Box UP">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Nom de la box *</label>
            <Input {...form.register('boxUpName')} placeholder="Ex: Box UP Printemps" />
            {form.formState.errors.boxUpName && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.boxUpName.message}</p>
            )}
          </div>

          <Card title="Partenaires" description="Sélectionnez les partenaires à inclure dans la Box UP">
            <div className="space-y-2">
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-ink/10 p-4">
                {partnersQuery.isLoading ? (
                  <p className="text-sm text-ink/50">Chargement des partenaires...</p>
                ) : (partnersQuery.data || []).length === 0 ? (
                  <p className="text-sm text-ink/50">Aucun partenaire disponible</p>
                ) : (
                  (partnersQuery.data || []).map((partner: Partner) => {
                    const isSelected = (form.watch('boxUpPartners') || []).includes(partner.id);
                    return (
                      <label
                        key={partner.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-ink/5"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePartner(partner.id)}
                        />
                        <span className="text-sm text-ink">{partner.name}</span>
                        {partner.category && (
                          <span className="ml-auto text-xs text-ink/50">({partner.category})</span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
              {form.formState.errors.boxUpPartners && (
                <p className="mt-1 text-xs text-red-500">{form.formState.errors.boxUpPartners.message}</p>
              )}
              {(form.watch('boxUpPartners') || []).length > 0 && (
                <p className="text-xs text-ink/50">
                  {form.watch('boxUpPartners')?.length || 0} partenaire(s) sélectionné(s)
                </p>
              )}
            </div>
          </Card>

          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Image de la box</label>
            <Input type="file" accept="image/*" onChange={handleBoxUpImageChange} />
            {boxUpImagePreview && (
              <img
                src={boxUpImagePreview}
                alt="Box UP preview"
                className="mt-2 h-32 w-full rounded-lg object-cover"
              />
            )}
            {configQuery.data?.boxUpImageUrl && !boxUpImagePreview && (
              <img
                src={configQuery.data.boxUpImageUrl}
                alt="Current box image"
                className="mt-2 h-32 w-full rounded-lg object-cover"
              />
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs uppercase text-ink/50">Comment ça marche</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingHowItWorks(!isEditingHowItWorks)}
              >
                {isEditingHowItWorks ? 'Masquer' : 'Modifier'}
              </Button>
            </div>
            {isEditingHowItWorks ? (
              <Textarea {...form.register('boxUpHowItWorks')} rows={4} />
            ) : (
              <div className="rounded-lg border border-ink/10 bg-ink/5 p-4">
                <p className="text-sm text-ink/70 whitespace-pre-line">
                  {form.watch('boxUpHowItWorks') || defaultHowItWorks}
                </p>
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs uppercase text-ink/50">Conditions</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingConditions(!isEditingConditions)}
              >
                {isEditingConditions ? 'Masquer' : 'Modifier'}
              </Button>
            </div>
            {isEditingConditions ? (
              <Textarea {...form.register('boxUpConditions')} rows={4} />
            ) : (
              <div className="rounded-lg border border-ink/10 bg-ink/5 p-4">
                <p className="text-sm text-ink/70 whitespace-pre-line">
                  {form.watch('boxUpConditions') || defaultConditions}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <HowItWorks content={form.watch('boxUpHowItWorks') || defaultHowItWorks} />

      <Conditions conditions={form.watch('boxUpConditions') || defaultConditions} />

      <div className="flex justify-end">
        <Button type="submit" isLoading={updateMutation.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
};

