import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { Partner, Territory } from '@/types/entities';
import { partnerFormSchema } from '../api';
import type { PartnerFormInput } from '../api';
import { useState, useEffect } from 'react';
import { PartnerDocuments } from './partner-documents';
import { PartnerOffers } from './partner-offers';

type TerritoryValue = 'martinique' | 'guadeloupe' | 'guyane';

const CategoriesSelector = ({ form }: { form: UseFormReturn<PartnerFormInput> }) => {
  const currentCategories = form.watch('categories') || [];
  const categories = [
    { value: 'Restauration', label: 'Restauration' },
    { value: 'Beauté et Bien-être', label: 'Beauté et Bien-être' },
    { value: 'Loisir', label: 'Loisir' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Mobilité', label: 'Mobilité' },
    { value: 'Culture', label: 'Culture' },
    { value: 'Sport', label: 'Sport' },
    { value: 'Mode', label: 'Mode' },
    { value: 'Électronique', label: 'Électronique' },
    { value: 'Services', label: 'Services' },
    { value: 'Autre', label: 'Autre' },
  ];

  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-ink/50">Catégories *</label>
      <div className="space-y-2 rounded-lg border border-ink/10 p-3 max-h-48 overflow-y-auto">
        {categories.map((category) => {
          const isChecked = currentCategories.includes(category.value);
          return (
            <label key={category.value} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => {
                  const current = form.getValues('categories') || [];
                  if (checked) {
                    form.setValue('categories', [...current, category.value], {
                      shouldValidate: true,
                    });
                  } else {
                    form.setValue(
                      'categories',
                      current.filter((c) => c !== category.value),
                      { shouldValidate: true },
                    );
                  }
                }}
              />
              <span className="text-sm text-ink">{category.label}</span>
            </label>
          );
        })}
      </div>
      {form.formState.errors.categories && (
        <p className="mt-1 text-xs text-red-500">{form.formState.errors.categories.message}</p>
      )}
    </div>
  );
};

const TerritoriesSelector = ({ form }: { form: UseFormReturn<PartnerFormInput> }) => {
  const currentTerritories = form.watch('territories') || [];
  const territories: Array<{ value: TerritoryValue; label: string }> = [
    { value: 'martinique', label: 'Martinique' },
    { value: 'guadeloupe', label: 'Guadeloupe' },
    { value: 'guyane', label: 'Guyane' },
  ];

  if (import.meta.env.DEV) {
    console.log('📍 TerritoriesSelector - Territoires actuels:', {
      currentTerritories,
      currentTerritoriesType: typeof currentTerritories,
      isArray: Array.isArray(currentTerritories),
      length: currentTerritories.length,
    });
  }

  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-ink/50">Territoires *</label>
      <div className="space-y-2 rounded-lg border border-ink/10 p-3">
        {territories.map((territory) => {
          // Normaliser la comparaison : convertir en minuscules pour la comparaison
          const normalizedCurrent = currentTerritories.map(t => String(t).toLowerCase());
          const normalizedValue = territory.value.toLowerCase();
          const isChecked = normalizedCurrent.includes(normalizedValue);
          
          if (import.meta.env.DEV) {
            console.log(`📍 Territoire ${territory.label}:`, {
              value: territory.value,
              normalizedValue,
              currentTerritories,
              normalizedCurrent,
              isChecked,
            });
          }

          return (
            <label key={territory.value} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => {
                  const current = form.getValues('territories') || [];
                  
                  if (import.meta.env.DEV) {
                    console.log(`📍 Changement territoire ${territory.label}:`, {
                      checked,
                      currentBefore: current,
                      territoryValue: territory.value,
                    });
                  }

                  if (checked) {
                    // S'assurer qu'on n'ajoute pas de doublon
                    const normalizedCurrent = current.map(t => String(t).toLowerCase());
                    if (!normalizedCurrent.includes(territory.value.toLowerCase())) {
                      const newTerritories = [...current, territory.value] as TerritoryValue[];
                      form.setValue('territories', newTerritories, {
                        shouldValidate: true,
                        shouldDirty: true, // IMPORTANT: Marquer comme modifié
                        shouldTouch: true,
                      });
                      
                      if (import.meta.env.DEV) {
                        console.log('✅ Territoire ajouté:', {
                          newTerritories,
                          added: territory.value,
                          formState: {
                            isDirty: form.formState.isDirty,
                            dirtyFields: form.formState.dirtyFields,
                          },
                        });
                      }
                    } else {
                      if (import.meta.env.DEV) {
                        console.warn('⚠️ Territoire déjà présent, ignoré:', {
                          territory: territory.value,
                          current,
                        });
                      }
                    }
                  } else {
                    // Filtrer en normalisant pour éviter les problèmes de casse
                    const filtered = current.filter((t) => 
                      String(t).toLowerCase() !== territory.value.toLowerCase()
                    ) as TerritoryValue[];
                    form.setValue('territories', filtered, {
                      shouldValidate: true,
                      shouldDirty: true, // IMPORTANT: Marquer comme modifié
                      shouldTouch: true,
                    });
                    
                    if (import.meta.env.DEV) {
                      console.log('✅ Territoire retiré:', {
                        filtered,
                        removed: territory.value,
                        formState: {
                          isDirty: form.formState.isDirty,
                          dirtyFields: form.formState.dirtyFields,
                        },
                      });
                    }
                  }
                }}
              />
              <span className="text-sm text-ink">{territory.label}</span>
            </label>
          );
        })}
      </div>
      {form.formState.errors.territories && (
        <p className="mt-1 text-xs text-red-500">{form.formState.errors.territories.message}</p>
      )}
    </div>
  );
};

const OpeningDaysSelector = ({ form }: { form: UseFormReturn<PartnerFormInput> }) => {
  const currentDays = (form.watch('openingDays') || []).map((d) => String(d).toLowerCase());
  const days = [
    { value: 'monday', label: 'Lun' },
    { value: 'tuesday', label: 'Mar' },
    { value: 'wednesday', label: 'Mer' },
    { value: 'thursday', label: 'Jeu' },
    { value: 'friday', label: 'Ven' },
    { value: 'saturday', label: 'Sam' },
    { value: 'sunday', label: 'Dim' },
  ];

  return (
    <div>
      <label className="mb-2 block text-xs uppercase text-ink/50">Jours d'ouverture</label>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-7">
        {days.map((day) => {
          const isChecked = currentDays.includes(day.value);
          return (
            <label key={day.value} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => {
                  const current = form.getValues('openingDays') || [];
                  if (checked) {
                    form.setValue('openingDays', [...current, day.value as any], {
                      shouldValidate: true,
                    });
                  } else {
                    form.setValue(
                      'openingDays',
                      current.filter((d) => d !== day.value),
                      { shouldValidate: true },
                    );
                  }
                }}
              />
              <span className="text-sm text-ink">{day.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const MarketingProgramsSelector = ({ form }: { form: UseFormReturn<PartnerFormInput> }) => {
  const currentPrograms = form.watch('marketingPrograms') || [];

  return (
    <Card title="Programmes marketing" description="Cochez les cases pour afficher ce partenaire dans les sections correspondantes de l'app (accueil, liste partenaires).">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="marketingPepites"
            checked={currentPrograms.includes('pepites')}
            onCheckedChange={(checked) => {
              const programs = form.getValues('marketingPrograms') || [];
              if (checked) {
                form.setValue('marketingPrograms', [...programs, 'pepites']);
              } else {
                form.setValue(
                  'marketingPrograms',
                  programs.filter((p) => p !== 'pepites'),
                );
              }
            }}
          />
          <label htmlFor="marketingPepites" className="text-sm font-medium text-ink">
            Pépites KashUP
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="marketingBoosted"
            checked={currentPrograms.includes('boosted')}
            onCheckedChange={(checked) => {
              const programs = form.getValues('marketingPrograms') || [];
              if (checked) {
                form.setValue('marketingPrograms', [...programs, 'boosted']);
              } else {
                form.setValue(
                  'marketingPrograms',
                  programs.filter((p) => p !== 'boosted'),
                );
              }
            }}
          />
          <label htmlFor="marketingBoosted" className="text-sm font-medium text-ink">
            Partenaires boostés
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="marketingMostSearched"
            checked={currentPrograms.includes('most-searched')}
            onCheckedChange={(checked) => {
              const programs = form.getValues('marketingPrograms') || [];
              if (checked) {
                form.setValue('marketingPrograms', [...programs, 'most-searched']);
              } else {
                form.setValue(
                  'marketingPrograms',
                  programs.filter((p) => p !== 'most-searched'),
                );
              }
            }}
          />
          <div>
            <label htmlFor="marketingMostSearched" className="text-sm font-medium text-ink cursor-pointer">
              Partenaire populaire
            </label>
            <p className="text-xs text-ink/50">Partenaires les plus recherchés (affichés sur l&apos;accueil)</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

type PartnerFormProps = {
  partner?: Partner;
  onSubmit: (values: PartnerFormInput) => void;
  isLoading?: boolean;
};

export const PartnerForm = ({ partner, onSubmit, isLoading }: PartnerFormProps) => {
  // Initialiser les previews avec les valeurs du partenaire si disponible
  const getInitialLogoPreview = () => {
    if (partner?.logoUrl && partner.logoUrl.startsWith('data:')) {
      return partner.logoUrl;
    }
    return null;
  };
  
  const getInitialMenuImagePreviews = () => {
    if (partner?.menuImages && Array.isArray(partner.menuImages) && partner.menuImages.length > 0) {
      return partner.menuImages.filter((img: string) => 
        img && typeof img === 'string' && img.startsWith('data:')
      );
    }
    return [];
  };
  
  const getInitialPhotoPreviews = () => {
    if (partner?.photos && Array.isArray(partner.photos) && partner.photos.length > 0) {
      return partner.photos.filter((img: string) => 
        img && typeof img === 'string' && img.startsWith('data:')
      );
    }
    return [];
  };
  
  const [logoPreview, setLogoPreview] = useState<string | null>(getInitialLogoPreview());
  const [kbisPreview, setKbisPreview] = useState<string | null>(partner?.kbisUrl ? 'Fichier Kbis' : null);
  const [menuImagePreviews, setMenuImagePreviews] = useState<string[]>(
    getInitialMenuImagePreviews(),
  );
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(getInitialPhotoPreviews());

  // Normaliser les territoires : s'assurer qu'on a toujours un array
  // IMPORTANT: Ne pas utiliser 'martinique' comme valeur par défaut - laisser vide si aucun territoire
  const normalizedTerritories: Territory[] = partner?.territories && partner.territories.length > 0
    ? partner.territories.map(t => {
        // Normaliser en minuscules pour correspondre aux slugs attendus
        const territoryStr = typeof t === 'string' ? t : (t as { id?: string; name?: string })?.name || String(t);
        const lower = territoryStr.toLowerCase();
        // Vérifier que c'est un slug valide
        if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') {
          return lower as Territory;
        }
        return territoryStr as Territory;
      })
    : partner?.territory
    ? (() => {
        const territoryStr = typeof partner.territory === 'string' 
          ? partner.territory 
          : (partner.territory as { id?: string; name?: string })?.name || String(partner.territory);
        const lower = territoryStr.toLowerCase();
        if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') {
          return [lower as Territory];
        }
        return [territoryStr as Territory];
      })()
    : []; // Pas de valeur par défaut - l'utilisateur doit sélectionner

  // Log CRITIQUE lors de l'initialisation
  if (import.meta.env.DEV) {
    console.log('🌍 INITIALISATION PartnerForm - Territoires:', {
      partnerId: partner?.id,
      partnerName: partner?.name,
      partnerTerritories: partner?.territories,
      partnerTerritory: partner?.territory,
      normalizedTerritories,
      normalizedTerritoriesLength: normalizedTerritories.length,
    });
  }

  // Normaliser les catégories : s'assurer qu'on a toujours un array et que les libellés matchent les options du formulaire (casse)
  const FORM_CATEGORY_OPTIONS = [
    'Restauration', 'Beauté et Bien-être', 'Loisir', 'Retail', 'Mobilité', 'Culture', 'Sport', 'Mode', 'Électronique', 'Services', 'Autre',
  ];
  const rawCategoryName = partner?.categories?.[0]
    || (typeof partner?.category === 'string' ? partner.category : (partner?.category && typeof partner.category === 'object' && 'name' in partner.category ? (partner.category as { name?: string }).name : ''));
  const normalizedCategories: string[] = partner?.categories && partner.categories.length > 0
    ? partner.categories.map((c) => {
        const match = FORM_CATEGORY_OPTIONS.find((opt) => opt.toLowerCase() === String(c).toLowerCase());
        return match ?? c;
      })
    : rawCategoryName
    ? (() => {
        const match = FORM_CATEGORY_OPTIONS.find((opt) => opt.toLowerCase() === String(rawCategoryName).toLowerCase());
        return match ? [match] : [String(rawCategoryName)];
      })()
    : [];

  const form = useForm<PartnerFormInput>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: {
      name: partner?.name || '',
      siret: partner?.siret || '',
      phone: partner?.phone || '',
      categories: normalizedCategories,
      territories: normalizedTerritories as ('martinique' | 'guadeloupe' | 'guyane')[],
      status: partner?.status || 'pending',
      discoveryCashbackRate: partner?.discoveryCashbackRate ?? 0,
      permanentCashbackRate: partner?.permanentCashbackRate ?? 0,
      welcomeAffiliationAmount: partner?.discoveryCashbackRate ?? partner?.welcomeAffiliationAmount ?? 0,
      permanentAffiliationAmount: partner?.permanentCashbackRate ?? partner?.permanentAffiliationAmount ?? 0,
      welcomeUserRate: partner?.discoveryCashbackUserShare ?? partner?.welcomeUserRate ?? 0,
      welcomeKashUPRate: partner?.discoveryCashbackKashupShare ?? partner?.welcomeKashUPRate ?? 0,
      permanentUserRate: partner?.permanentCashbackUserShare ?? partner?.permanentUserRate ?? 0,
      permanentKashUPRate: partner?.permanentCashbackKashupShare ?? partner?.permanentKashUPRate ?? 0,
      giftCardEnabled: partner?.giftCardEnabled ?? false,
      giftCardCashbackRate: partner?.giftCardCashbackRate ?? 0,
      giftCardDescription: partner?.giftCardDescription || '',
      boostEnabled: partner?.boostEnabled ?? false,
      boostRate: partner?.boostRate ?? 0,
      address: partner?.address || '',
      pointsPerTransaction: partner?.pointsPerTransaction ?? 0,
      marketingPrograms: partner?.marketingPrograms || [],
      openingHoursStart: (typeof partner?.openingHours === 'string'
        ? partner.openingHours.split(' - ')[0]?.trim()
        : partner?.openingHours?.start) || '',
      openingHoursEnd: (typeof partner?.openingHours === 'string'
        ? partner.openingHours.split(' - ')[1]?.trim()
        : partner?.openingHours?.end) || '',
      openingDays: partner?.openingDays || [],
      websiteUrl: partner?.websiteUrl || '',
      instagramUrl: partner?.instagramUrl || '',
      facebookUrl: partner?.facebookUrl || '',
      territoryDetails: (() => {
        const raw = partner?.territoryDetails;
        if (raw && typeof raw === 'object') {
          const m = (raw as Record<string, unknown>).Martinique ?? (raw as Record<string, unknown>).martinique ?? {};
          const g = (raw as Record<string, unknown>).Guadeloupe ?? (raw as Record<string, unknown>).guadeloupe ?? {};
          const gy = (raw as Record<string, unknown>).Guyane ?? (raw as Record<string, unknown>).guyane ?? {};
          return { Martinique: m as Record<string, string>, Guadeloupe: g as Record<string, string>, Guyane: gy as Record<string, string> };
        }
        return { Martinique: {}, Guadeloupe: {}, Guyane: {} };
      })(),
    },
  });

  const selectedCategories = form.watch('categories') || [];
  const isRestaurant = selectedCategories.includes('Restauration');
  const giftCardEnabled = form.watch('giftCardEnabled');
  const boostEnabled = form.watch('boostEnabled');

  // IMPORTANT: Synchroniser les territoires du formulaire avec le partenaire
  useEffect(() => {
    if (partner) {
      // Normaliser les territoires du partenaire
      const partnerTerritories = partner.territories && partner.territories.length > 0
        ? partner.territories.map(t => {
            const territoryStr = typeof t === 'string' ? t : (t as { id?: string; name?: string })?.name || String(t);
            const lower = territoryStr.toLowerCase();
            if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') {
              return lower as Territory;
            }
            return territoryStr as Territory;
          })
        : partner.territory
        ? (() => {
            const territoryStr = typeof partner.territory === 'string' 
              ? partner.territory 
              : (partner.territory as { id?: string; name?: string })?.name || String(partner.territory);
            const lower = territoryStr.toLowerCase();
            if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') {
              return [lower as Territory];
            }
            return [territoryStr as Territory];
          })()
        : [];
      
      const currentFormTerritories = form.getValues('territories') || [];
      const normalizedCurrent = currentFormTerritories.map(t => String(t).toLowerCase()).sort();
      const normalizedPartner = partnerTerritories.map(t => String(t).toLowerCase()).sort();
      const territoriesChanged = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedPartner);
      
      if (territoriesChanged) {
        if (import.meta.env.DEV) {
          console.log('🔄 Synchronisation des territoires du formulaire:', {
            partnerId: partner.id,
            old: currentFormTerritories,
            new: partnerTerritories,
            normalizedOld: normalizedCurrent,
            normalizedNew: normalizedPartner,
          });
        }
        form.setValue('territories', partnerTerritories as ('martinique' | 'guadeloupe' | 'guyane')[], {
          shouldValidate: false,
          shouldDirty: false, // Ne pas marquer comme modifié car c'est juste une synchronisation
        });
      }
    }
  }, [partner?.id, partner?.territories, partner?.territory, form]);

  // Réinitialiser tout le formulaire quand le partenaire change (chargement ou refetch) pour que catégories et jours d'ouverture restent coché
  useEffect(() => {
    if (!partner) return;
    const rawCat =
      partner.categories?.[0] ||
      (typeof partner.category === 'string'
        ? partner.category
        : (partner.category && typeof partner.category === 'object' && 'name' in partner.category
            ? (partner.category as { name?: string }).name
            : ''));
    const nextCategories =
      partner.categories && partner.categories.length > 0
        ? partner.categories.map((c) => {
            const match = FORM_CATEGORY_OPTIONS.find((opt) => opt.toLowerCase() === String(c).toLowerCase());
            return match ?? c;
          })
        : rawCat
          ? (() => {
              const match = FORM_CATEGORY_OPTIONS.find((opt) => opt.toLowerCase() === String(rawCat).toLowerCase());
              return match ? [match] : [String(rawCat)];
            })()
          : [];
    const nextOpeningDays = Array.isArray(partner.openingDays)
      ? partner.openingDays
      : typeof partner.openingDays === 'string'
        ? (() => {
            try {
              const p = JSON.parse(partner.openingDays);
              return Array.isArray(p) ? p : [];
            } catch {
              return [];
            }
          })()
        : [];
    const nextTerritories: Territory[] =
      partner.territories && partner.territories.length > 0
        ? partner.territories.map((t) => {
            const territoryStr = typeof t === 'string' ? t : (t as { id?: string; name?: string })?.name || String(t);
            const lower = territoryStr.toLowerCase();
            if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') return lower as Territory;
            return territoryStr as Territory;
          })
        : partner.territory
          ? (() => {
              const territoryStr =
                typeof partner.territory === 'string'
                  ? partner.territory
                  : (partner.territory as { id?: string; name?: string })?.name || String(partner.territory);
              const lower = territoryStr.toLowerCase();
              if (lower === 'martinique' || lower === 'guadeloupe' || lower === 'guyane') return [lower as Territory];
              return [territoryStr as Territory];
            })()
          : [];
    form.reset({
      name: partner.name || '',
      siret: partner.siret || '',
      phone: partner.phone || '',
      categories: nextCategories,
      territories: nextTerritories as ('martinique' | 'guadeloupe' | 'guyane')[],
      status: partner.status || 'pending',
      discoveryCashbackRate: partner.discoveryCashbackRate ?? 0,
      permanentCashbackRate: partner.permanentCashbackRate ?? 0,
      welcomeAffiliationAmount: partner.discoveryCashbackRate ?? partner.welcomeAffiliationAmount ?? 0,
      permanentAffiliationAmount: partner.permanentCashbackRate ?? partner.permanentAffiliationAmount ?? 0,
      welcomeUserRate: partner.discoveryCashbackUserShare ?? partner.welcomeUserRate ?? 0,
      welcomeKashUPRate: partner.discoveryCashbackKashupShare ?? partner.welcomeKashUPRate ?? 0,
      permanentUserRate: partner.permanentCashbackUserShare ?? partner.permanentUserRate ?? 0,
      permanentKashUPRate: partner.permanentCashbackKashupShare ?? partner.permanentKashUPRate ?? 0,
      giftCardEnabled: partner.giftCardEnabled ?? false,
      giftCardCashbackRate: partner.giftCardCashbackRate ?? 0,
      giftCardDescription: partner.giftCardDescription || '',
      boostEnabled: partner.boostEnabled ?? false,
      boostRate: partner.boostRate ?? 0,
      address: partner.address || '',
      pointsPerTransaction: partner.pointsPerTransaction ?? 0,
      marketingPrograms: partner.marketingPrograms || [],
      openingHoursStart:
        typeof partner.openingHours === 'string'
          ? partner.openingHours.split(' - ')[0]?.trim() || ''
          : (partner.openingHours as { start?: string })?.start || '',
      openingHoursEnd:
        typeof partner.openingHours === 'string'
          ? partner.openingHours.split(' - ')[1]?.trim() || ''
          : (partner.openingHours as { end?: string })?.end || '',
      openingDays: nextOpeningDays,
      websiteUrl: partner.websiteUrl || '',
      instagramUrl: partner.instagramUrl || '',
      facebookUrl: partner.facebookUrl || '',
      territoryDetails: (() => {
        const raw = (partner as { territoryDetails?: Record<string, unknown> }).territoryDetails;
        if (raw && typeof raw === 'object') {
          const m = raw.Martinique ?? raw.martinique ?? {};
          const g = raw.Guadeloupe ?? raw.guadeloupe ?? {};
          const gy = raw.Guyane ?? raw.guyane ?? {};
          return { Martinique: m as Record<string, string>, Guadeloupe: g as Record<string, string>, Guyane: gy as Record<string, string> };
        }
        return { Martinique: {}, Guadeloupe: {}, Guyane: {} };
      })(),
    });
  }, [partner]);

  // Mettre à jour les previews quand le partenaire change (après création/mise à jour)
  useEffect(() => {
    if (partner) {
      // Log CRITIQUE pour les territoires lors du chargement
      if (import.meta.env.DEV) {
        console.log('🌍 TERRITOIRES CHARGÉS DEPUIS L\'API (PartnerForm useEffect):', {
          partnerId: partner.id,
          partnerName: partner.name,
          territories: partner.territories,
          territory: partner.territory,
          territoriesType: typeof partner.territories,
          isArray: Array.isArray(partner.territories),
          territoriesLength: partner.territories?.length || 0,
          normalizedTerritories,
          formTerritories: form.getValues('territories'),
        });
      }
      
      if (import.meta.env.DEV) {
        console.log('[PartnerForm] Mise à jour des previews pour le partenaire:', {
          id: partner.id,
          hasLogoUrl: !!partner.logoUrl,
          logoUrlType: partner.logoUrl ? (partner.logoUrl.startsWith('data:') ? 'data URL' : 'URL normale') : 'null',
          hasMenuImages: !!partner.menuImages && Array.isArray(partner.menuImages) && partner.menuImages.length > 0,
          menuImagesCount: partner.menuImages?.length || 0,
          hasPhotos: !!partner.photos && Array.isArray(partner.photos) && partner.photos.length > 0,
          photosCount: partner.photos?.length || 0,
        });
      }
      
      // Toujours mettre à jour le logo si le partenaire a une URL
      if (partner.logoUrl) {
        setLogoPreview(partner.logoUrl);
      } else {
        // Si le partenaire n'a plus de logo, réinitialiser seulement si on n'est pas en train d'éditer
        // (pour éviter de perdre le preview pendant l'édition)
        if (!form.getValues('logo')) {
          setLogoPreview(null);
        }
      }
      
      // Pour le Kbis, on affiche juste le nom du fichier
      if (partner.kbisUrl) {
        setKbisPreview('Fichier Kbis');
      } else {
        if (!form.getValues('kbis')) {
          setKbisPreview(null);
        }
      }
      
      // Toujours mettre à jour les images de menu si elles existent
      if (partner.menuImages && Array.isArray(partner.menuImages) && partner.menuImages.length > 0) {
        // Filtrer les URLs valides (data URLs ou URLs normales)
        const validMenuImages = partner.menuImages.filter((img: string) => 
          img && typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http'))
        );
        if (validMenuImages.length > 0) {
          setMenuImagePreviews(validMenuImages);
        } else {
          // Si aucune image valide, garder les previews actuels si on a des fichiers en cours
          const currentFiles = form.getValues('menuImages');
          if (!currentFiles || currentFiles.length === 0) {
            setMenuImagePreviews([]);
          }
        }
      } else {
        // Si le partenaire n'a plus d'images de menu, réinitialiser seulement si on n'a pas de fichiers en cours
        const currentFiles = form.getValues('menuImages');
        if (!currentFiles || currentFiles.length === 0) {
          setMenuImagePreviews([]);
        }
      }
      
      // Toujours mettre à jour les photos si elles existent
      if (partner.photos && Array.isArray(partner.photos) && partner.photos.length > 0) {
        // Filtrer les URLs valides (data URLs ou URLs normales)
        const validPhotos = partner.photos.filter((img: string) => 
          img && typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http'))
        );
        if (validPhotos.length > 0) {
          setPhotoPreviews(validPhotos);
        } else {
          // Si aucune photo valide, garder les previews actuels si on a des fichiers en cours
          const currentFiles = form.getValues('photos');
          if (!currentFiles || currentFiles.length === 0) {
            setPhotoPreviews([]);
          }
        }
      } else {
        // Si le partenaire n'a plus de photos, réinitialiser seulement si on n'a pas de fichiers en cours
        const currentFiles = form.getValues('photos');
        if (!currentFiles || currentFiles.length === 0) {
          setPhotoPreviews([]);
        }
      }
    } else {
      // Si pas de partenaire (création), réinitialiser les previews
      setLogoPreview(null);
      setKbisPreview(null);
      setMenuImagePreviews([]);
      setPhotoPreviews([]);
    }
  }, [partner?.id, partner?.logoUrl, partner?.kbisUrl, partner?.menuImages, partner?.photos, form]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('logo', file, { shouldValidate: true });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKbisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('kbis', file, { shouldValidate: true });
      setKbisPreview(file.name);
    }
  };

  const handleMenuImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const currentFiles = form.getValues('menuImages') || [];
      form.setValue('menuImages', [...currentFiles, ...files], { shouldValidate: true });
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMenuImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const currentFiles = form.getValues('photos') || [];
      form.setValue('photos', [...currentFiles, ...files], { shouldValidate: true });
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMenuImage = (index: number) => {
    const currentFiles = form.getValues('menuImages') || [];
    const currentPreviews = [...menuImagePreviews];
    currentFiles.splice(index, 1);
    currentPreviews.splice(index, 1);
    form.setValue('menuImages', currentFiles, { shouldValidate: true });
    setMenuImagePreviews(currentPreviews);
  };

  const removePhoto = (index: number) => {
    const currentFiles = form.getValues('photos') || [];
    const currentPreviews = [...photoPreviews];
    currentFiles.splice(index, 1);
    currentPreviews.splice(index, 1);
    form.setValue('photos', currentFiles, { shouldValidate: true });
    setPhotoPreviews(currentPreviews);
  };

  return (
    <>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit(
          (values) => {
            console.log('✅ Validation réussie - Données du formulaire:', values);
            console.log('📤 Envoi à l\'API:', import.meta.env.VITE_API_URL);
            
            // IMPORTANT: S'assurer que les territoires sont toujours inclus dans le payload
            // Même si le formulaire pense qu'ils n'ont pas changé, on les envoie quand même
            const payloadToSend: PartnerFormInput = {
              ...values,
              // Forcer l'inclusion des territoires actuels du formulaire
              territories: values.territories && values.territories.length > 0 
                ? values.territories 
                : form.getValues('territories') || [],
            };
            
            // Log CRITIQUE pour les territoires
            if (import.meta.env.DEV) {
              console.log('🌍 TERRITOIRES DANS LE FORMULAIRE (AVANT ENVOI):', {
                originalTerritories: values.territories,
                payloadTerritories: payloadToSend.territories,
                territoriesType: typeof payloadToSend.territories,
                isArray: Array.isArray(payloadToSend.territories),
                length: payloadToSend.territories?.length || 0,
                values: payloadToSend.territories?.map(t => ({
                  value: t,
                  type: typeof t,
                  lower: String(t).toLowerCase(),
                })),
                formState: {
                  isDirty: form.formState.isDirty,
                  dirtyFields: form.formState.dirtyFields,
                  touchedFields: form.formState.touchedFields,
                },
                allFormValues: {
                  name: payloadToSend.name,
                  categories: payloadToSend.categories,
                  territories: payloadToSend.territories,
                  status: payloadToSend.status,
                },
              });
            }
            
            // Log spécifique pour le logo
            if (import.meta.env.DEV) {
              console.log('🖼️ Logo dans les valeurs du formulaire:', {
                hasLogo: 'logo' in payloadToSend,
                logoType: payloadToSend.logo ? typeof payloadToSend.logo : 'undefined',
                logoIsFile: payloadToSend.logo instanceof File,
                logoName: payloadToSend.logo instanceof File ? payloadToSend.logo.name : 'N/A',
                logoSize: payloadToSend.logo instanceof File ? payloadToSend.logo.size : 'N/A',
              });
            }
            
            // Envoyer le payload avec les territoires garantis
            onSubmit(payloadToSend);
          },
          (errors) => {
            console.error('❌ Erreurs de validation du formulaire:', errors);
            const errorMessages = Object.entries(errors)
              .map(([field, error]) => {
                const fieldName = field === 'territories' ? 'Territoires' : field === 'category' ? 'Catégorie' : field === 'name' ? 'Nom' : field;
                return `${fieldName}: ${error?.message || 'Champ invalide'}`;
              })
              .join(', ');
            toast.error(`Erreurs de validation: ${errorMessages}`);
          }
        )(event);
      }}
      className="space-y-6"
    >
      <Card title="Informations de base">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Nom *</label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">SIRET</label>
              <Input {...form.register('siret')} placeholder="12345678901234" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Téléphone</label>
              <Input {...form.register('phone')} placeholder="+596 696 12 34 56" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
              <Select {...form.register('status')}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
                <option value="pending">En attente</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CategoriesSelector form={form} />
            <TerritoriesSelector form={form} />
          </div>

          <MarketingProgramsSelector form={form} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Logo</label>
              <Input type="file" accept="image/*" onChange={handleLogoChange} />
              {logoPreview && (
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="mt-2 h-24 w-24 rounded-lg object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Kbis</label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleKbisChange} />
              {kbisPreview && <p className="mt-2 text-xs text-ink/70">{kbisPreview}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Adresse</label>
            <Textarea {...form.register('address')} rows={2} placeholder="Adresse complète du partenaire" />
          </div>
        </div>
      </Card>

      <Card title="Informations complémentaires">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Heure d'ouverture</label>
              <Input
                type="time"
                {...form.register('openingHoursStart')}
                placeholder="09:00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Heure de fermeture</label>
              <Input
                type="time"
                {...form.register('openingHoursEnd')}
                placeholder="18:00"
              />
            </div>
          </div>

          <OpeningDaysSelector form={form} />

          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Site internet</label>
            <Input
              type="url"
              {...form.register('websiteUrl')}
              placeholder="https://www.exemple.com"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Instagram</label>
              <Input
                type="url"
                {...form.register('instagramUrl')}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Facebook</label>
              <Input
                type="url"
                {...form.register('facebookUrl')}
                placeholder="https://facebook.com/..."
              />
            </div>
          </div>

          <div className="border-t border-ink/10 pt-4 mt-4">
            <h4 className="mb-3 text-sm font-semibold text-primary">Adresse et réseaux par département</h4>
            <p className="mb-4 text-xs text-ink/60">Renseignez une adresse et des liens par département (optionnel). Utilisés sur l’app selon le département choisi ou la localisation.</p>
            {(['Martinique', 'Guadeloupe', 'Guyane'] as const).map((dept) => (
              <div key={dept} className="mb-6 rounded-lg border border-ink/10 bg-ink/5 p-4">
                <h5 className="mb-3 text-xs font-semibold uppercase text-ink/70">{dept}</h5>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Adresse</label>
                    <Textarea
                      {...form.register(`territoryDetails.${dept}.address`)}
                      rows={2}
                      placeholder={`Adresse pour ${dept}`}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink/50">Site internet</label>
                    <Input
                      type="url"
                      {...form.register(`territoryDetails.${dept}.websiteUrl`)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-ink/50">Instagram</label>
                      <Input
                        type="url"
                        {...form.register(`territoryDetails.${dept}.instagramUrl`)}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ink/50">Facebook</label>
                      <Input
                        type="url"
                        {...form.register(`territoryDetails.${dept}.facebookUrl`)}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isRestaurant && (
            <div>
              <label className="mb-2 block text-xs uppercase text-ink/50">Menu (photos)</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMenuImagesChange}
                className="mb-2"
              />
              {menuImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {menuImagePreviews.map((preview, index) => (
                    <div key={`menu-${index}-${preview.substring(0, 20)}`} className="relative">
                      <img
                        src={preview}
                        alt={`Menu ${index + 1}`}
                        className="h-24 w-full rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeMenuImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs uppercase text-ink/50">Photos</label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotosChange}
              className="mb-2"
            />
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={`photo-${index}-${preview.substring(0, 20)}`} className="relative">
                    <img
                      src={preview}
                      alt={`Photo ${index + 1}`}
                      className="h-24 w-full rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title="Affiliations">
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary">Taux négocié</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Offre bienvenue (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('welcomeAffiliationAmount', { valueAsNumber: true })}
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Offre permanente (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('permanentAffiliationAmount', { valueAsNumber: true })}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary">Offre bienvenue</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Taux users (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('welcomeUserRate', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        form.setValue('welcomeKashUPRate', Math.round((100 - value) * 10) / 10, {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Taux kashUP (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('welcomeKashUPRate', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        form.setValue('welcomeUserRate', Math.round((100 - value) * 10) / 10, {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary">Offre permanente</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Taux users (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('permanentUserRate', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        form.setValue('permanentKashUPRate', Math.round((100 - value) * 10) / 10, {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-ink/50">Taux kashUP (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register('permanentKashUPRate', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        form.setValue('permanentUserRate', Math.round((100 - value) * 10) / 10, {
                          shouldValidate: true,
                        });
                      }
                    },
                  })}
                  placeholder="0.0"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Carte Sélection UP" description="Permet à ce partenaire d'être sélectionnable par les utilisateurs pour offrir une Carte Sélection UP (bon d'achat personnalisé).">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="giftCardEnabled"
              checked={giftCardEnabled || false}
              onCheckedChange={(checked) => form.setValue('giftCardEnabled', checked === true)}
            />
            <label htmlFor="giftCardEnabled" className="text-sm font-medium text-ink">
              Activer les cartes cadeaux
            </label>
          </div>
        </div>
      </Card>

      <Card title="Boost">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="boostEnabled"
              checked={boostEnabled || false}
              onCheckedChange={(checked) => form.setValue('boostEnabled', checked === true)}
            />
            <label htmlFor="boostEnabled" className="text-sm font-medium text-ink">
              Activer les boosts
            </label>
          </div>

          {boostEnabled && (
            <div>
              <label className="mb-1 block text-xs uppercase text-ink/50">Taux de boost (%)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...form.register('boostRate', { valueAsNumber: true })}
              />
            </div>
          )}
        </div>
      </Card>

      <Card title="Points et transactions">
        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Points par transaction</label>
          <Input
            type="number"
            min="0"
            {...form.register('pointsPerTransaction', { valueAsNumber: true })}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" isLoading={isLoading}>
          {partner ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>

    {/* Encart Offres du moment - toujours visible */}
    <div className="mt-6">
      {partner?.id ? (
        <PartnerOffers
          partnerId={partner.id}
          partnerName={partner.name}
          partnerLogoUrl={partner.logoUrl}
        />
      ) : (
        <Card title="Offres du moment" description="Les offres seront disponibles après la création du partenaire">
          <p className="text-sm text-ink/50">
            Créez d'abord le partenaire pour pouvoir ajouter des offres.
          </p>
        </Card>
      )}
    </div>

    {/* Encart Documents - seulement si partenaire existe */}
    {partner?.id && (
      <div className="mt-6">
        <PartnerDocuments partnerId={partner.id} />
      </div>
    )}
  </>
  );
};

