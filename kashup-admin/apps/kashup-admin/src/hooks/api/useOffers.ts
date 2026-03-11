/**
 * Hooks pour les offres
 */

import { useApiQuery, useApiMutation } from './useApiQuery';
import {
  fetchOffers,
  fetchOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from '@/services/api/offers';
import type { OfferFilters, CreateOfferInput, UpdateOfferInput } from '@/types/api/offer.dto';
import type { ListParams } from '@/types/api';

/**
 * Hook pour récupérer la liste des offres
 */
export const useOffers = (filters: OfferFilters = {}, listParams: ListParams = {}) => {
  return useApiQuery(
    ['offers', filters, listParams],
    () => fetchOffers(filters, listParams),
    {
      staleTime: 30 * 1000,
    }
  );
};

/**
 * Hook pour récupérer une offre par ID
 */
export const useOffer = (id: string | null) => {
  return useApiQuery(
    ['offers', id],
    () => {
      if (!id) throw new Error('Offer ID is required');
      return fetchOffer(id);
    },
    {
      enabled: !!id,
      staleTime: 30 * 1000,
    }
  );
};

/**
 * Hook pour créer une offre
 */
export const useCreateOffer = () => {
  return useApiMutation(
    (data: CreateOfferInput) => createOffer(data),
    {
      invalidateQueries: [['offers']],
    }
  );
};

/**
 * Hook pour mettre à jour une offre
 */
export const useUpdateOffer = () => {
  return useApiMutation(
    ({ id, data }: { id: string; data: UpdateOfferInput }) => updateOffer(id, data),
    {
      invalidateQueries: [['offers']],
    }
  );
};

/**
 * Hook pour supprimer une offre
 */
export const useDeleteOffer = () => {
  return useApiMutation(
    (id: string) => deleteOffer(id),
    {
      invalidateQueries: [['offers']],
    }
  );
};

