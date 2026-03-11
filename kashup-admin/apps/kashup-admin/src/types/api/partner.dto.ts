/**
 * DTOs pour les partenaires
 * Alignés sur le contrat API backend
 */

export type Partner = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  category?: string;
  status: 'active' | 'inactive' | 'pending';
  cashbackRate?: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerFilters = {
  status?: 'active' | 'inactive' | 'pending';
  category?: string;
  search?: string;
};

export type CreatePartnerInput = {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  category?: string;
  cashbackRate?: number;
};

export type UpdatePartnerInput = Partial<CreatePartnerInput> & {
  status?: 'active' | 'inactive' | 'pending';
};

