/**
 * Service pour les dons
 */

import { apiClient } from './api';
import { unwrapStandardResponse } from '../types/api';

export interface Association {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Projet {
  id: string;
  title: string;
  description: string;
  associationId: string;
  association?: Association;
  targetAmount: number;
  currentAmount: number;
  imageUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Récupère les associations disponibles
 */
export async function fetchAssociations(): Promise<Association[]> {
  const response = await apiClient<Association[]>('GET', '/donations/associations');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère les projets disponibles
 */
export async function fetchProjets(): Promise<Projet[]> {
  const response = await apiClient<Projet[]>('GET', '/donations/projets');
  const data = unwrapStandardResponse(response);
  return Array.isArray(data) ? data : [];
}

