/**
 * Service pour les offres
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface Offer {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  cashbackRate: number;
  startDate: string;
  endDate: string;
  status: string;
  stock?: number | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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

