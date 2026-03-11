import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { fetchPartnerById, updatePartner } from '../api';
import type { PartnerFormInput } from '../api';
import { formatDate } from '@/lib/utils/format';
import { PartnerTabs } from '../components/partner-tabs';

export const PartnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const partnerQuery = useQuery({
    queryKey: ['partner', id],
    queryFn: () => fetchPartnerById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PartnerFormInput> }) => {
      // Log CRITIQUE avant l'appel API
      if (import.meta.env.DEV) {
        console.log('🚀 APPEL updatePartner avec payload:', {
          id,
          payload,
          hasTerritories: 'territories' in payload,
          territories: payload.territories,
          territoriesLength: payload.territories?.length || 0,
          allKeys: Object.keys(payload),
        });
      }
      return updatePartner(id, payload);
    },
    onSuccess: async (updatedPartner) => {
      toast.success('Partenaire mis à jour');
      
      // Log CRITIQUE pour voir les territoires retournés
      if (import.meta.env.DEV) {
        console.log('🌍 TERRITOIRES RETOURNÉS PAR LE BACKEND:', {
          id: updatedPartner.id,
          name: updatedPartner.name,
          territories: updatedPartner.territories,
          territory: updatedPartner.territory,
          territoriesLength: updatedPartner.territories?.length || 0,
          fullPartner: updatedPartner,
        });
      }
      
      // Mettre à jour le cache avec les données retournées par le backend
      // Cela inclut le nouveau logoUrl si un logo a été uploadé
      if (updatedPartner) {
        queryClient.setQueryData(['partner', id], updatedPartner);
        if (import.meta.env.DEV) {
          console.log('✅ Cache mis à jour avec le partenaire retourné:', {
            id: updatedPartner.id,
            hasLogoUrl: !!updatedPartner.logoUrl,
            logoUrl: updatedPartner.logoUrl,
            territories: updatedPartner.territories,
          });
        }
      }
      
      // Invalider les queries pour forcer le refetch
      await queryClient.invalidateQueries({ queryKey: ['partner', id] });
      await queryClient.invalidateQueries({ queryKey: ['partners'] });
      // Forcer le refetch immédiat pour récupérer le nouveau logoUrl
      await queryClient.refetchQueries({ queryKey: ['partner', id] });
      await queryClient.refetchQueries({ queryKey: ['partners'] });
      
      if (import.meta.env.DEV) {
        console.log('🔄 Partenaire rafraîchi après mise à jour pour récupérer le nouveau logo');
      }
    },
    onError: (error) => {
      console.error('❌ Erreur lors de la mise à jour du partenaire:', error);
      toast.error('Impossible de mettre à jour le partenaire');
    },
  });

  if (partnerQuery.isLoading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (partnerQuery.error || !partnerQuery.data) {
    return (
      <div className="p-6">
        <p className="text-red-500">Partenaire introuvable</p>
        <Button onClick={() => navigate('/partners')} className="mt-4">
          Retour à la liste
        </Button>
      </div>
    );
  }

  const partner = partnerQuery.data;

  const statusTone = {
    active: 'success',
    inactive: 'muted',
    pending: 'warning',
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/partners')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-ink">{partner.name}</h1>
          <p className="text-sm text-ink/50">Détails du partenaire</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PartnerTabs
            partner={partner}
            onUpdate={(values) => {
              if (id) {
                updateMutation.mutate({ id, payload: values });
              }
            }}
            isUpdating={updateMutation.isPending}
          />
        </div>

        <div className="space-y-6">
          <Card title="Informations générales">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-ink/50">ID:</span>
                <p className="font-mono text-ink">{partner.id}</p>
              </div>
              <div>
                <span className="text-ink/50">Date d'ajout:</span>
                <p className="text-ink">{formatDate(partner.createdAt)}</p>
              </div>
              <div>
                <span className="text-ink/50">Statut:</span>
                <div className="mt-1">
                  <Badge tone={statusTone[partner.status]}>{partner.status}</Badge>
                </div>
              </div>
              {partner.siret && (
                <div>
                  <span className="text-ink/50">SIRET:</span>
                  <p className="text-ink">{partner.siret}</p>
                </div>
              )}
              {(partner.categories && partner.categories.length > 0) || partner.category ? (
                <div>
                  <span className="text-ink/50">Catégories:</span>
                  <p className="text-ink">
                    {(partner.categories && partner.categories.length > 0)
                      ? partner.categories.join(', ')
                      : (typeof partner.category === 'string' 
                          ? partner.category 
                          : (partner.category as { id?: string; name?: string })?.name || 'Catégorie inconnue')}
                  </p>
                </div>
              ) : null}
              {(partner.territories && partner.territories.length > 0) || partner.territory ? (
                <div>
                  <span className="text-ink/50">Territoires:</span>
                  <p className="text-ink">
                    {partner.territories && partner.territories.length > 0
                      ? partner.territories.map(t => 
                          typeof t === 'string' 
                            ? t 
                            : (t as { id?: string; name?: string })?.name || String(t)
                        ).join(', ')
                      : (typeof partner.territory === 'string' 
                          ? partner.territory 
                          : (partner.territory as { id?: string; name?: string })?.name || String(partner.territory || 'Territoire inconnu'))}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          {partner.logoUrl && (
            <Card title="Logo">
              <img 
                src={partner.logoUrl} 
                alt={partner.name} 
                className="h-32 w-32 rounded-lg object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </Card>
          )}

          {partner.kbisUrl && (
            <Card title="Kbis">
              <a
                href={partner.kbisUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Télécharger le Kbis
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

