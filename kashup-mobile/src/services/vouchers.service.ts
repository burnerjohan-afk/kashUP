/**
 * Service pour les Vouchers (Bons d'achat)
 * Pattern standardisé: GET /api/v1/vouchers (liste) et GET /api/v1/vouchers/:id (détail)
 * Aligné avec l'API (vouchers ou giftcards selon l'API)
 */

import { ResourceService } from './resourceService';

export interface Voucher {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  value: number;
  price: number;
  partnerId?: string;
  partner?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  available: boolean;
  expiryDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VouchersFilters {
  page?: number;
  limit?: number;
  search?: string;
  partnerId?: string;
  available?: boolean;
}

// Essayer 'vouchers' d'abord, sinon 'giftcards' selon l'API
const vouchersService = new ResourceService<Voucher>('vouchers');

/**
 * Récupère la liste des Vouchers
 */
export async function listVouchers(filters?: VouchersFilters): Promise<Voucher[]> {
  return vouchersService.list(filters);
}

/**
 * Récupère un Voucher par ID
 */
export async function getVoucher(id: string): Promise<Voucher> {
  return vouchersService.get(id);
}

