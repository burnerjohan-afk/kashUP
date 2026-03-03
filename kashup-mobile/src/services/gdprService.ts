/**
 * Service RGPD pour gérer les consentements, export et suppression de données
 */

import { unwrapStandardResponse } from '../types/api';
import { apiClient } from './api';

export type ConsentType = 
  | 'marketing' 
  | 'analytics' 
  | 'personalization' 
  | 'third_party_sharing'
  | 'banking_data';

export interface Consent {
  type: ConsentType;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
}

export interface ConsentsResponse {
  consents: Consent[];
  lastUpdated: string;
}

export interface DataExportResponse {
  data: {
    profile: any;
    transactions: any[];
    rewards: any[];
    partners: any[];
    consents: Consent[];
    [key: string]: any;
  };
  exportedAt: string;
  format: 'json';
}

/**
 * Récupère tous les consentements de l'utilisateur
 */
export async function fetchConsents(): Promise<ConsentsResponse> {
  const response = await apiClient<ConsentsResponse>('GET', '/users/me/consents');
  return unwrapStandardResponse(response);
}

/**
 * Enregistre ou met à jour un consentement
 */
export async function updateConsent(type: ConsentType, granted: boolean): Promise<Consent> {
  const response = await apiClient<Consent>('POST', '/users/me/consents', {
    type,
    granted,
  });
  return unwrapStandardResponse(response);
}

/**
 * Révoque un consentement
 */
export async function revokeConsent(type: ConsentType): Promise<void> {
  await apiClient<void>('POST', '/users/me/consents/revoke', { type });
}

/**
 * Exporte toutes les données de l'utilisateur (RGPD)
 */
export async function exportUserData(): Promise<DataExportResponse> {
  const response = await apiClient<DataExportResponse>('GET', '/users/me/export');
  return unwrapStandardResponse(response);
}

/**
 * Supprime le compte utilisateur (droit à l'oubli - RGPD)
 */
export async function deleteUserAccount(): Promise<void> {
  await apiClient<void>('DELETE', '/users/me');
}

