/**
 * Service pour les cartes cadeaux
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface GiftCard {
  id: string;
  type: 'bon_achat' | 'carte_cadeau' | 'box_up' | string;
  name: string;
  description: string;
  value: number;
  isGiftable: boolean;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiftBox {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  priceFrom: number;
  heroImageUrl?: string | null;
  cashbackInfo?: string | null;
  partners: Array<{
    id: string;
    name: string;
    accentColor?: string | null;
    category?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère les cartes cadeaux disponibles
 */
export async function fetchGiftCards(): Promise<GiftCard[]> {
  const response = await apiClient<GiftCard[]>('GET', '/gift-cards');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère les boxes cadeaux disponibles
 */
export async function fetchGiftBoxes(): Promise<GiftBox[]> {
  const response = await apiClient<GiftBox[]>('GET', '/gift-boxes');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

