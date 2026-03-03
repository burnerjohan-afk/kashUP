/**
 * Service pour les Badges
 * Pattern standardisé: GET /api/v1/badges (liste) et GET /api/v1/badges/:id (détail)
 */

import { ResourceService } from './resourceService';

export interface Badge {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BadgesFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

const badgesService = new ResourceService<Badge>('badges');

/**
 * Récupère la liste des Badges
 */
export async function listBadges(filters?: BadgesFilters): Promise<Badge[]> {
  return badgesService.list(filters);
}

/**
 * Récupère un Badge par ID
 */
export async function getBadge(id: string): Promise<Badge> {
  return badgesService.get(id);
}

