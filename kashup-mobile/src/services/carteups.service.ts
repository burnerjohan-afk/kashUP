/**
 * Service pour les CarteUps
 * Pattern standardisé: GET /api/v1/carteups (liste) et GET /api/v1/carteups/:id (détail)
 */

import { ResourceService } from './resourceService';

export interface CarteUp {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  price: number;
  partnerId?: string;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarteUpsFilters {
  page?: number;
  limit?: number;
  search?: string;
  partnerId?: string;
  available?: boolean;
}

const carteUpsService = new ResourceService<CarteUp>('carteups');

/**
 * Récupère la liste des CarteUps
 */
export async function listCarteUps(filters?: CarteUpsFilters): Promise<CarteUp[]> {
  return carteUpsService.list(filters);
}

/**
 * Récupère un CarteUp par ID
 */
export async function getCarteUp(id: string): Promise<CarteUp> {
  return carteUpsService.get(id);
}

