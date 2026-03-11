/**
 * DTOs pour les offres
 */

export type Offer = {
  id: string;
  title: string;
  description?: string;
  partnerId: string;
  partnerName?: string;
  type: 'percentage' | 'fixed' | 'points';
  value: number;
  startAt: string;
  endAt: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  updatedAt: string;
};

export type OfferFilters = {
  partnerId?: string;
  status?: 'active' | 'inactive' | 'expired';
  type?: 'percentage' | 'fixed' | 'points';
};

export type CreateOfferInput = {
  title: string;
  description?: string;
  partnerId: string;
  type: 'percentage' | 'fixed' | 'points';
  value: number;
  startAt: string;
  endAt: string;
};

export type UpdateOfferInput = Partial<CreateOfferInput> & {
  status?: 'active' | 'inactive' | 'expired';
};

