/**
 * Service pour les Loteries
 * Pattern standardisé: GET /api/v1/lotteries (liste) et GET /api/v1/lotteries/:id (détail)
 */

import { ResourceService } from './resourceService';

export interface Lottery {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  prize: string;
  drawDate?: string;
  status: 'upcoming' | 'active' | 'ended';
  participantCount?: number;
  maxParticipants?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LotteriesFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'upcoming' | 'active' | 'ended';
}

const lotteriesService = new ResourceService<Lottery>('lotteries');

/**
 * Récupère la liste des Loteries
 */
export async function listLotteries(filters?: LotteriesFilters): Promise<Lottery[]> {
  return lotteriesService.list(filters);
}

/**
 * Récupère une Lottery par ID
 */
export async function getLottery(id: string): Promise<Lottery> {
  return lotteriesService.get(id);
}

