/**
 * Service pour les BoxUps
 * Pattern standardisé: GET /api/v1/boxups (liste) et GET /api/v1/boxups/:id (détail)
 */

import { ResourceService } from './resourceService';

export interface BoxUp {
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

export interface BoxUpsFilters {
  page?: number;
  limit?: number;
  search?: string;
  partnerId?: string;
  available?: boolean;
}

const boxUpsService = new ResourceService<BoxUp>('boxups');

/**
 * Récupère la liste des BoxUps
 */
export async function listBoxUps(filters?: BoxUpsFilters): Promise<BoxUp[]> {
  return boxUpsService.list(filters);
}

/**
 * Récupère un BoxUp par ID
 */
export async function getBoxUp(id: string): Promise<BoxUp> {
  return boxUpsService.get(id);
}

