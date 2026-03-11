/**
 * Hooks pour les partenaires
 */

import { useApiQuery, useApiMutation } from './useApiQuery';
import {
  fetchPartners,
  fetchPartner,
  createPartner,
  updatePartner,
  deletePartner,
} from '@/services/api/partners';
import type { PartnerFilters, CreatePartnerInput, UpdatePartnerInput } from '@/types/api/partner.dto';
import type { ListParams } from '@/types/api';

/**
 * Hook pour récupérer la liste des partenaires
 */
export const usePartners = (filters: PartnerFilters = {}, listParams: ListParams = {}) => {
  return useApiQuery(
    ['partners', filters, listParams],
    () => fetchPartners(filters, listParams),
    {
      staleTime: 30 * 1000, // 30 secondes
    }
  );
};

/**
 * Hook pour récupérer un partenaire par ID
 */
export const usePartner = (id: string | null) => {
  return useApiQuery(
    ['partners', id],
    () => {
      if (!id) throw new Error('Partner ID is required');
      return fetchPartner(id);
    },
    {
      enabled: !!id,
      staleTime: 30 * 1000,
    }
  );
};

/**
 * Hook pour créer un partenaire
 */
export const useCreatePartner = () => {
  return useApiMutation(
    (data: CreatePartnerInput) => createPartner(data),
    {
      invalidateQueries: [['partners']],
    }
  );
};

/**
 * Hook pour mettre à jour un partenaire
 */
export const useUpdatePartner = () => {
  return useApiMutation(
    ({ id, data }: { id: string; data: UpdatePartnerInput }) => updatePartner(id, data),
    {
      invalidateQueries: [['partners']],
    }
  );
};

/**
 * Hook pour supprimer un partenaire
 */
export const useDeletePartner = () => {
  return useApiMutation(
    (id: string) => deletePartner(id),
    {
      invalidateQueries: [['partners']],
    }
  );
};

