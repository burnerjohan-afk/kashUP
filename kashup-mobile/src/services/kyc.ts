/**
 * Service pour gérer la vérification KYC (Know Your Customer)
 * Conforme à DSP2 pour les services de paiement
 */

import { ApiError, unwrapStandardResponse } from '../types/api';
import { apiClient } from './api';

export type KYCStatus = 'not_started' | 'pending' | 'verified' | 'rejected' | 'expired';

export type KYCInfo = {
  status: KYCStatus;
  level: number; // Niveau de vérification requis (1-3)
  required: boolean; // Si KYC est requis pour l'action demandée
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  documents?: Array<{
    type: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
  }>;
};

export type KYCVerificationRequest = {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format ISO: YYYY-MM-DD
  nationality: string; // Code pays ISO (ex: 'FR', 'GP')
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  idDocument?: {
    type: 'passport' | 'id_card' | 'driving_license';
    number: string;
    expiryDate: string;
  };
};

/**
 * Récupère le statut KYC de l'utilisateur
 */
export async function fetchKYCStatus(): Promise<KYCInfo> {
  try {
    const response = await apiClient<{ kyc: KYCInfo }>('GET', '/users/me/kyc/status');
    return unwrapStandardResponse(response).kyc;
  } catch (error) {
    console.error('[KYC] Erreur lors de la récupération du statut KYC:', error);
    throw new ApiError('Impossible de récupérer le statut KYC', 500);
  }
}

/**
 * Vérifie si le KYC est requis pour une action spécifique
 */
export async function checkKYCRequired(action: string): Promise<boolean> {
  try {
    const response = await apiClient<{ required: boolean }>('GET', `/users/me/kyc/required?action=${action}`);
    return unwrapStandardResponse(response).required;
  } catch (error) {
    console.error('[KYC] Erreur lors de la vérification KYC requise:', error);
    return false; // En cas d'erreur, on considère que KYC n'est pas requis pour ne pas bloquer
  }
}

/**
 * Soumet une demande de vérification KYC
 */
export async function submitKYCVerification(data: KYCVerificationRequest): Promise<KYCInfo> {
  try {
    const response = await apiClient<{ kyc: KYCInfo }>('POST', '/users/me/kyc/verify', data);
    return unwrapStandardResponse(response).kyc;
  } catch (error) {
    console.error('[KYC] Erreur lors de la soumission KYC:', error);
    throw new ApiError('Impossible de soumettre la vérification KYC', 500);
  }
}

/**
 * Vérifie si l'utilisateur peut effectuer une action nécessitant KYC
 */
export async function canPerformAction(action: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const kycStatus = await fetchKYCStatus();
    
    // Si KYC n'est pas requis pour cette action
    const required = await checkKYCRequired(action);
    if (!required) {
      return { allowed: true };
    }

    // Si KYC est requis mais pas vérifié
    if (kycStatus.status !== 'verified') {
      return {
        allowed: false,
        reason: kycStatus.status === 'rejected' 
          ? 'Votre vérification d\'identité a été rejetée. Veuillez contacter le support.'
          : 'Une vérification d\'identité est requise pour cette action.',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[KYC] Erreur lors de la vérification d\'action:', error);
    // En cas d'erreur, on autorise pour ne pas bloquer l'utilisateur
    return { allowed: true };
  }
}

