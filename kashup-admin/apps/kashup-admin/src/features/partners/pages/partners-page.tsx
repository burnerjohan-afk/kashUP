import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { Partner } from '@/types/entities';
import { createPartner, fetchPartnerCategories, fetchPartners } from '../api';
import type { PartnerFormInput, PartnersFilters } from '../api';
import { PartnerForm } from '../components/partner-form';
import { ApiError } from '@/lib/api/response';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

const statusTone = {
  active: 'success',
  inactive: 'muted',
  pending: 'warning',
} as const;

/**
 * Page de gestion des partenaires
 * 
 * ENDPOINTS UTILISÉS:
 * - GET /partners (avec filtres optionnels) → fetchPartners()
 * - POST /partners (multipart/form-data) → createPartner()
 * - GET /partners/categories → fetchPartnerCategories()
 * 
 * GESTION DES FILTRES:
 * - Les valeurs 'all', chaînes vides, ou undefined sont automatiquement filtrées
 *   dans fetchPartners() pour ne pas être envoyées au backend
 * - Cela évite les erreurs 400/500 liées aux paramètres invalides
 */
export const PartnersPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PartnersFilters>({
    territory: 'all',
    category: '',
    search: '',
    sortBy: 'updatedAt', // Trier par date de mise à jour pour voir les plus récents en premier
    sortOrder: 'desc', // Décroissant = plus récents en premier
    page: 1,
    limit: import.meta.env.DEV ? 1000 : 100, // Limite très élevée en dev pour voir tous les partenaires
  });

  const partnersQuery = useQuery({
    queryKey: ['partners', filters],
    queryFn: () => fetchPartners(filters),
    // Forcer le refetch à chaque montage pour voir les nouveaux partenaires
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Ne pas utiliser le cache, toujours refetch
    gcTime: 0, // Ne pas garder en cache
  });

  // Extraire les partenaires et la pagination de la réponse
  // IMPORTANT: Toujours définir partnersList comme un tableau vide par défaut pour éviter les crashes
  const partnersData = partnersQuery.data;
  const partnersList: Partner[] = partnersData?.partners ?? [];
  const pagination = partnersData?.pagination;

  // Déclarer sortedPartners AVANT toute utilisation (y compris dans les logs)
  // Utiliser useMemo pour optimiser le tri et éviter les recalculs inutiles
  const sortedPartners = useMemo(() => {
    // IMPORTANT: Toujours retourner TOUS les partenaires, même si le tri échoue
    // S'assurer que partnersList est toujours un tableau
    if (!partnersList || partnersList.length === 0) {
      return [];
    }
    
    // Si le tri est géré côté serveur (sortBy est défini), utiliser directement les données
    // Sinon, trier côté client (pour compatibilité)
    if (filters.sortBy && filters.sortBy !== 'transactionGrowth' && filters.sortBy !== 'averageBasketGrowth') {
      // Le tri est géré côté serveur, retourner directement
      // S'assurer qu'on retourne bien tous les partenaires
      return partnersList;
    }
    
    // Tri côté client uniquement pour les champs non supportés par l'API
    if (!filters.sortBy) return partnersList;

    try {
      return [...partnersList].sort((a, b) => {
        let aValue: number | string = 0;
        let bValue: number | string = 0;

        switch (filters.sortBy) {
          case 'transactionGrowth':
            aValue = a.transactionGrowth ?? 0;
            bValue = b.transactionGrowth ?? 0;
            break;
          case 'averageBasketGrowth':
            aValue = a.averageBasketGrowth ?? 0;
            bValue = b.averageBasketGrowth ?? 0;
            break;
          case 'name':
            aValue = (a.name || '').toLowerCase();
            bValue = (b.name || '').toLowerCase();
            break;
          default:
            // Pour les autres cas, ne pas trier
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return filters.sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      });
    } catch (error) {
      // En cas d'erreur de tri, retourner tous les partenaires non triés
      if (import.meta.env.DEV) {
        console.error('❌ Erreur lors du tri des partenaires:', error);
      }
      return partnersList;
    }
  }, [partnersList, filters.sortBy, filters.sortOrder]);

  // Log pour debug en développement (APRÈS la déclaration de sortedPartners)
  if (import.meta.env.DEV) {
    console.log('📊 État de la liste des partenaires:', {
      isLoading: partnersQuery.isLoading,
      isError: partnersQuery.isError,
      partnersCount: partnersList.length,
      sortedPartnersCount: sortedPartners.length,
      pagination,
      filters,
      allPartners: partnersList.map(p => ({ 
        id: p.id, 
        name: p.name, 
        status: p.status,
        hasLogo: !!p.logoUrl,
        hasCategories: !!(p.categories && p.categories.length > 0),
        hasTerritories: !!(p.territories && p.territories.length > 0),
      })),
    });
    
    // Vérifier s'il y a une différence entre partnersList et sortedPartners
    if (partnersList.length !== sortedPartners.length) {
      console.warn(`⚠️ ATTENTION: ${partnersList.length} partenaires reçus mais ${sortedPartners.length} après tri`);
    }
  }

  const categoriesQuery = useQuery({
    queryKey: ['partners-categories'],
    queryFn: fetchPartnerCategories,
  });

  const queryClient = useQueryClient();

  const createPartnerMutation = useMutation({
    mutationFn: async (payload: PartnerFormInput) => {
      console.log('🚀 Début de la création du partenaire');
      console.log('📋 Payload:', payload);
      console.log('🌐 URL API:', import.meta.env.VITE_API_URL);
      try {
        const result = await createPartner(payload);
        console.log('✅ Partenaire créé avec succès:', result);
        return result;
      } catch (error) {
        console.error('❌ Erreur dans createPartner:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('✅ Mutation réussie, redirection vers:', `/partners/${data.id}`);
      toast.success('Partenaire créé avec succès');
      
      if (import.meta.env.DEV) {
        console.log('📋 Nouveau partenaire créé:', { 
          id: data.id, 
          name: data.name, 
          status: data.status,
          categories: data.categories,
          territories: data.territories,
          hasLogoUrl: !!data.logoUrl,
          logoUrl: data.logoUrl,
        });
      }
      
      // Mettre à jour le cache avec le partenaire créé (inclut le logoUrl transformé)
      // Cela permet d'afficher le logo immédiatement sans attendre le refetch
      queryClient.setQueryData(['partner', data.id], data);
      
      // Supprimer complètement le cache pour forcer un refetch complet
      queryClient.removeQueries({ queryKey: ['partners'] });
      
      // Invalider toutes les queries liées aux partenaires
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
      await queryClient.invalidateQueries({ queryKey: ['partners-categories'] });
      
      // Forcer un refetch immédiat de TOUTES les queries partenaires (sans exact match)
      await queryClient.refetchQueries({ 
        queryKey: ['partners'],
        exact: false, // Refetch toutes les queries qui commencent par ['partners']
      });
      
      if (import.meta.env.DEV) {
        console.log('🔄 Liste des partenaires rafraîchie après création');
        // Attendre un peu pour que les données soient disponibles
        setTimeout(() => {
          const newData = queryClient.getQueryData(['partners', filters]);
          const partnersList = newData && typeof newData === 'object' && 'partners' in newData 
            ? (newData as { partners: unknown[] }).partners 
            : [];
          console.log('📊 Nouveau nombre de partenaires après refetch:', partnersList.length);
          
          // Vérifier si le nouveau partenaire est dans la liste et a un logoUrl
          const newPartner = Array.isArray(partnersList) 
            ? partnersList.find((p: any) => p.id === data.id)
            : null;
          if (newPartner) {
            console.log('✅ Nouveau partenaire trouvé dans la liste:', {
              id: (newPartner as any).id,
              name: (newPartner as any).name,
              hasLogoUrl: !!(newPartner as any).logoUrl,
              logoUrl: (newPartner as any).logoUrl,
            });
          } else {
            console.warn('⚠️ Nouveau partenaire non trouvé dans la liste après refetch');
          }
        }, 500);
      }
      
      // Attendre un peu pour que le refetch se termine avant de naviguer
      setTimeout(() => {
        navigate(`/partners/${data.id}`);
      }, 1000); // Augmenter le délai pour laisser le temps au refetch
    },
    onError: (error: unknown) => {
      let errorMessage = 'Création impossible';
      let errorDetails = '';
      
      if (error instanceof ApiError) {
        errorMessage = error.message || errorMessage;
        if (error.statusCode) {
          errorMessage = `[${error.statusCode}] ${errorMessage}`;
        }
        if (error.code) {
          errorMessage = `[${error.code}] ${errorMessage}`;
        }
        if (error.details) {
          const detailsStr = typeof error.details === 'string' 
            ? error.details 
            : JSON.stringify(error.details);
          errorDetails = detailsStr;
        }
        // Récupérer les erreurs de validation par champ (nouveau format StandardResponse)
        if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
          // Afficher chaque erreur de validation séparément
          Object.entries(error.fieldErrors).forEach(([field, errors]) => {
            const fieldName = field === 'territories' ? 'Territoires' 
              : field === 'category' ? 'Catégorie' 
              : field === 'name' ? 'Nom' 
              : field;
            errors.forEach((err) => {
              toast.error(`${fieldName}: ${err}`);
            });
          });
          // Ne pas afficher le message général si on a des erreurs de validation
          return;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        // Vérifier si c'est une erreur réseau
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible.';
        }
      } else if (error && typeof error === 'object') {
        // Erreur HTTP de ky
        const httpError = error as { response?: { status?: number; statusText?: string }; message?: string };
        if (httpError.response) {
          errorMessage = `Erreur ${httpError.response.status || 'HTTP'}: ${httpError.response.statusText || 'Erreur serveur'}`;
        } else if (httpError.message) {
          errorMessage = httpError.message;
        }
      }
      
      const fullMessage = errorDetails ? `${errorMessage} - Détails: ${errorDetails}` : errorMessage;
      toast.error(fullMessage);
      console.error('Erreur lors de la création du partenaire:', error);
      console.error('Type d\'erreur:', error?.constructor?.name);
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    },
  });

  const onPartnerSubmit = (values: PartnerFormInput) => void createPartnerMutation.mutate(values);

  return (
    <div className="min-w-0 space-y-6">
      <Card 
        title="Catalogue partenaires" 
        description="Filtres catégorie, territoire, géolocalisation"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['partners'] });
              void partnersQuery.refetch();
            }}
            isLoading={partnersQuery.isFetching}
          >
            🔄 Rafraîchir
          </Button>
        }
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Rechercher"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          <Select
            value={filters.category ?? ''}
            onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
          >
            <option value="">Toutes catégories</option>
            {(categoriesQuery.data ?? []).map((category) => {
              // S'assurer que category est une string
              const categoryValue = typeof category === 'string' 
                ? category 
                : (category as { id?: string; name?: string })?.name || String(category);
              const categoryKey = typeof category === 'string' 
                ? category 
                : (category as { id?: string; name?: string })?.id || categoryValue;
              
              return (
                <option key={categoryKey} value={categoryValue}>
                  {categoryValue}
                </option>
              );
            })}
          </Select>
          <Select
            value={filters.territory ?? 'all'}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, territory: event.target.value as PartnersFilters['territory'] }))
            }
          >
            <option value="all">Tous territoires</option>
            <option value="martinique">Martinique</option>
            <option value="guadeloupe">Guadeloupe</option>
            <option value="guyane">Guyane</option>
          </Select>
          <Select
            value={filters.sortBy ?? ''}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                sortBy: event.target.value as PartnersFilters['sortBy'],
              }))
            }
          >
            <option value="">Trier par...</option>
            <option value="updatedAt">Date de mise à jour (récent)</option>
            <option value="createdAt">Date de création (récent)</option>
            <option value="name">Nom</option>
            <option value="transactionGrowth">Croissance transactions</option>
            <option value="averageBasketGrowth">Croissance panier moyen</option>
          </Select>
          {filters.sortBy && (
            <Select
              value={filters.sortOrder ?? 'desc'}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  sortOrder: event.target.value as PartnersFilters['sortOrder'],
                }))
              }
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </Select>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {partnersQuery.isLoading ? (
            <p className="text-sm text-ink/50">Chargement des partenaires...</p>
          ) : partnersQuery.isError ? (
            <p className="text-sm text-warning">Erreur lors du chargement des partenaires</p>
          ) : sortedPartners.length === 0 ? (
            <p className="text-sm text-ink/50">
              {filters.search || filters.category || filters.territory !== 'all'
                ? 'Aucun partenaire ne correspond aux filtres sélectionnés'
                : 'Aucun partenaire enregistré'}
            </p>
          ) : (
            <>
              {import.meta.env.DEV && (
                <div className="mb-4 rounded-lg bg-ink/5 p-3 text-xs">
                  <p className="font-semibold text-ink">Debug: {sortedPartners.length} partenaires affichés</p>
                  <p className="text-ink/60">
                    Total reçu: {partnersList.length} | Après tri: {sortedPartners.length}
                  </p>
                </div>
              )}
              {sortedPartners.map((partner) => {
                // IMPORTANT: Afficher TOUS les partenaires, même incomplets
                // Ne filtrer AUCUN partenaire basé sur logoUrl, status, category, etc.
                return (
                  <PartnerRow
                    key={partner.id}
                    partner={partner}
                    onClick={() => navigate(`/partners/${partner.id}`)}
                  />
                );
              })}
            </>
          )}
        </div>
      </Card>

      <Card title="Créer un partenaire" description="Formulaire complet de création">
        <PartnerForm onSubmit={onPartnerSubmit} isLoading={createPartnerMutation.isPending} />
      </Card>
    </div>
  );
};

const PartnerRow = ({ partner, onClick }: { partner: Partner; onClick: () => void }) => {
  const transactionGrowth = partner.transactionGrowth ?? 0;
  const averageBasketGrowth = partner.averageBasketGrowth ?? 0;

  // Transformer les catégories : support des catégories multiples et ancien format
  const categoriesDisplay = (partner.categories && partner.categories.length > 0)
    ? partner.categories.join(', ')
    : (typeof partner.category === 'string' 
        ? partner.category 
        : (partner.category as { id?: string; name?: string })?.name || 'Catégorie inconnue');

  // Transformer territory si c'est un objet
  // Capitaliser la première lettre pour l'affichage
  const capitalizeTerritory = (territory: string): string => {
    const lower = territory.toLowerCase();
    if (lower === 'martinique') return 'Martinique';
    if (lower === 'guadeloupe') return 'Guadeloupe';
    if (lower === 'guyane') return 'Guyane';
    // Si ce n'est pas un territoire connu, capitaliser la première lettre
    return territory.charAt(0).toUpperCase() + territory.slice(1).toLowerCase();
  };

  const territoryDisplay = (partner.territories && partner.territories.length > 0) 
    ? partner.territories.map(t => {
        const territoryStr = typeof t === 'string' 
          ? t 
          : (t as { id?: string; name?: string })?.name || String(t);
        return capitalizeTerritory(territoryStr);
      }).join(', ')
    : (typeof partner.territory === 'string' 
        ? capitalizeTerritory(partner.territory)
        : (partner.territory as { id?: string; name?: string })?.name 
          ? capitalizeTerritory((partner.territory as { id?: string; name?: string }).name || '')
          : 'Territoire inconnu');

  // Log pour diagnostic
  if (import.meta.env.DEV) {
    console.log('📍 Affichage territoire pour partenaire:', {
      partnerId: partner.id,
      partnerName: partner.name,
      territories: partner.territories,
      territory: partner.territory,
      territoryDisplay,
    });
  }

  // Vérifier si le partenaire est incomplet (pour afficher un badge)
  const isIncomplete = !partner.logoUrl || 
                       !partner.categories || 
                       partner.categories.length === 0 ||
                       !partner.territories || 
                       partner.territories.length === 0;

  // S'assurer que le nom existe (fallback si manquant)
  const partnerName = partner.name || 'Partenaire sans nom';

  return (
    <div
      className="flex cursor-pointer flex-wrap items-start gap-3 rounded-2xl border border-ink/5 p-4 transition-colors hover:border-primary/20 hover:bg-ink/2 sm:items-center sm:gap-4"
      onClick={onClick}
    >
      {/* Logo ou initiale - toujours affiché même si logoUrl est manquant */}
      {partner.logoUrl ? (
        <img
          src={normalizeImageUrl(partner.logoUrl) ?? partner.logoUrl}
          alt={partnerName}
          className="h-12 w-12 shrink-0 rounded-lg object-contain bg-ink/5"
          loading="lazy"
          crossOrigin="anonymous"
          onError={(e) => {
            // En cas d'erreur de chargement d'image, afficher l'initiale
            const target = e.target as HTMLImageElement;
            const img = e.target as HTMLImageElement;
            
            // Diagnostiquer le type d'erreur
            if (import.meta.env.DEV) {
              // Essayer de récupérer plus d'informations sur l'erreur
              fetch(normalizeImageUrl(partner.logoUrl) ?? partner.logoUrl, { method: 'HEAD' })
                .then((response) => {
                  console.error('❌ Erreur de chargement du logo (diagnostic):', {
                    partnerId: partner.id,
                    partnerName: partner.name,
                    logoUrl: partner.logoUrl,
                    status: response.status,
                    statusText: response.statusText,
                    contentType: response.headers.get('Content-Type'),
                    cors: response.headers.get('Access-Control-Allow-Origin'),
                    errorType: response.status === 404 ? 'Fichier introuvable (404)' : 
                               response.status === 200 ? 'Fichier existe mais bloqué (CORS/Content-Type)' :
                               `Erreur HTTP ${response.status}`,
                  });
                })
                .catch((fetchError) => {
                  console.error('❌ Erreur de chargement du logo:', {
                    partnerId: partner.id,
                    partnerName: partner.name,
                    logoUrl: partner.logoUrl,
                    error: e,
                    fetchError: fetchError.message,
                  });
                });
            }
            
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.logo-fallback')) {
              const fallback = document.createElement('div');
              fallback.className = 'logo-fallback flex h-12 w-12 items-center justify-center rounded-lg bg-ink/5 text-xs font-semibold text-ink/50';
              fallback.textContent = partnerName.charAt(0).toUpperCase();
              fallback.title = `Logo non disponible: ${partner.logoUrl}`;
              parent.appendChild(fallback);
            }
          }}
          onLoad={() => {
            if (import.meta.env.DEV) {
              console.log('✅ Logo chargé avec succès:', {
                partnerId: partner.id,
                partnerName: partner.name,
                logoUrl: partner.logoUrl,
              });
            }
          }}
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-xs font-semibold text-ink/50">
          {partnerName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate font-semibold text-ink" translate="no">{partnerName}</p>
          {isIncomplete && (
            <Badge tone="warning" className="shrink-0 text-xs">
              Incomplet
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-ink/50">
          {categoriesDisplay} • {territoryDisplay}
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-4">
        <div className="flex items-center gap-1">
          {transactionGrowth > 0 && <ArrowUp className="h-4 w-4 shrink-0 text-green-500" />}
          {transactionGrowth < 0 && <ArrowDown className="h-4 w-4 shrink-0 text-red-500" />}
          <span className="whitespace-nowrap text-xs text-ink/70">Transactions</span>
        </div>
        <div className="flex items-center gap-1">
          {averageBasketGrowth > 0 && <ArrowUp className="h-4 w-4 shrink-0 text-green-500" />}
          {averageBasketGrowth < 0 && <ArrowDown className="h-4 w-4 shrink-0 text-red-500" />}
          <span className="whitespace-nowrap text-xs text-ink/70">Panier moyen</span>
        </div>
        <Badge tone={statusTone[partner.status || 'pending']} className="shrink-0">
          {partner.status || 'pending'}
        </Badge>
      </div>
    </div>
  );
};


