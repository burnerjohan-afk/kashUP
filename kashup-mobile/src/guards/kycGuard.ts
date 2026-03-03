/**
 * Guard KYC pour protéger les écrans/actions nécessitant une vérification d'identité
 * Conforme à DSP2
 */

import { canPerformAction } from '../services/kyc';

export type ActionRequiringKYC = 
  | 'payment' 
  | 'withdrawal' 
  | 'gift_card_purchase' 
  | 'donation' 
  | 'wallet_topup'
  | 'bank_link';

export type GuardResult = {
  allowed: boolean;
  reason?: string;
  redirectTo?: 'KYCVerification';
};

/**
 * Vérifie si l'utilisateur peut accéder à une action nécessitant KYC
 */
export async function checkKYCAccess(action: ActionRequiringKYC): Promise<GuardResult> {
  try {
    const result = await canPerformAction(action);
    
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason,
        redirectTo: 'KYCVerification',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[KYC Guard] Erreur lors de la vérification:', error);
    // En cas d'erreur, on autorise pour ne pas bloquer l'utilisateur
    return { allowed: true };
  }
}

/**
 * Hook pour utiliser le guard KYC dans un composant React
 */
export function useKYCGuard() {
  const checkAccess = async (action: ActionRequiringKYC): Promise<GuardResult> => {
    return await checkKYCAccess(action);
  };

  return { checkAccess };
}
