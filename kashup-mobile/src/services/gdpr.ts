/**
 * Service pour gérer la conformité RGPD
 * Gère les consentements, l'export de données et la suppression de compte
 */

import { ApiError, unwrapStandardResponse } from '../types/api';
import { apiClient } from './api';

export type ConsentType = 'marketing' | 'analytics' | 'functional' | 'necessary';

export type Consent = {
  type: ConsentType;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
};

export type ConsentResponse = {
  consents: Consent[];
};

export type UserDataExport = {
  profile: any;
  transactions: any[];
  rewards: any[];
  partners: any[];
  offers: any[];
  donations: any[];
  consents: Consent[];
  createdAt: string;
  exportedAt: string;
};

/**
 * Récupère tous les consentements de l'utilisateur
 */
export async function fetchConsents(): Promise<Consent[]> {
  try {
    const response = await apiClient<ConsentResponse>('GET', '/users/me/consents');
    return unwrapStandardResponse(response).consents;
  } catch (error) {
    console.error('[GDPR] Erreur lors de la récupération des consentements:', error);
    throw new ApiError('Impossible de récupérer les consentements', 500);
  }
}

/**
 * Enregistre ou met à jour un consentement
 */
export async function updateConsent(type: ConsentType, granted: boolean): Promise<Consent> {
  try {
    const response = await apiClient<{ consent: Consent }>('POST', '/users/me/consents', {
      type,
      granted,
    });
    return unwrapStandardResponse(response).consent;
  } catch (error) {
    console.error('[GDPR] Erreur lors de la mise à jour du consentement:', error);
    throw new ApiError('Impossible de mettre à jour le consentement', 500);
  }
}

/**
 * Révoque un consentement
 */
export async function revokeConsent(type: ConsentType): Promise<void> {
  try {
    await apiClient('POST', `/users/me/consents/${type}/revoke`);
  } catch (error) {
    console.error('[GDPR] Erreur lors de la révocation du consentement:', error);
    throw new ApiError('Impossible de révoquer le consentement', 500);
  }
}

/**
 * Exporte toutes les données de l'utilisateur (RGPD - droit d'accès)
 */
export async function exportUserData(): Promise<UserDataExport> {
  try {
    const response = await apiClient<{ export: UserDataExport }>('GET', '/users/me/export');
    return unwrapStandardResponse(response).export;
  } catch (error) {
    console.error('[GDPR] Erreur lors de l\'export des données:', error);
    throw new ApiError('Impossible d\'exporter les données', 500);
  }
}

/**
 * Supprime le compte utilisateur et toutes ses données (RGPD - droit à l'oubli)
 */
export async function deleteAccount(): Promise<void> {
  try {
    await apiClient('DELETE', '/users/me');
  } catch (error) {
    console.error('[GDPR] Erreur lors de la suppression du compte:', error);
    throw new ApiError('Impossible de supprimer le compte', 500);
  }
}

