/**
 * Service pour les offres du moment (PartnerOffer)
 * Tous les champs exposés dans le back office sont disponibles pour l'app.
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface Offer {
  id: string;
  partnerId: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  priority?: number;
  rewardType?: string | null;
  startsAt: string;
  endsAt: string;
  active?: boolean;
  price?: number | null;
  cashbackRate?: number | null;
  stock?: number | null;
  stockUsed?: number;
  status: string;
  conditions?: string | null;
  updatedAt: string;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    territories?: unknown;
  } | null;
  /** Alias pour compatibilité */
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

/**
 * Récupère les offres actuelles
 */
export async function fetchCurrentOffers(): Promise<Offer[]> {
  const response = await apiClient<Offer[]>('GET', '/offers/current');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère une offre par son ID
 */
export async function fetchOfferById(id: string): Promise<Offer> {
  const response = await apiClient<Offer>('GET', `/offers/${id}`);
  return unwrapStandardResponse(response);
}

/**
 * Valide l'utilisation d'une offre par l'utilisateur (décrémente le stock restant).
 * Authentification requise.
 */
export async function useOffer(offerId: string): Promise<Offer> {
  const response = await apiClient<Offer>('POST', `/offers/${offerId}/use`);
  return unwrapStandardResponse(response);
}

