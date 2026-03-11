/**
 * Journalisation d'audit pour conformité RGPD/DSP2
 * 
 * Tous les accès et modifications de données personnelles doivent être loggés
 * Conservation: 12 mois minimum (RGPD)
 */

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';

export type AuditEventType =
  | 'user_view'
  | 'user_modify'
  | 'wallet_adjust'
  | 'kyc_force'
  | 'password_reset'
  | 'powens_access'
  | 'transaction_view'
  | 'transaction_modify'
  | 'partner_view'
  | 'partner_modify';

export type AuditEvent = {
  type: AuditEventType;
  userId?: string;
  partnerId?: string;
  transactionId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Log un événement d'audit
 * Ne bloque jamais l'action si le log échoue
 */
export const logAuditEvent = async (event: AuditEvent): Promise<void> => {
  try {
    const adminUser = useAuthStore.getState().user;
    
    await apiClient.post('admin/audit/log', {
      ...event,
      adminId: adminUser?.id || 'unknown',
      adminEmail: adminUser?.email || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      // IP sera récupérée côté serveur depuis les headers
    });
  } catch (error) {
    // Ne pas bloquer l'action si le log échoue
    // Mais logger l'erreur en dev pour debug
    if (import.meta.env.DEV) {
      console.error('❌ Failed to log audit event:', error);
    }
  }
};

/**
 * Hook React pour logger les accès aux données utilisateur
 */
export const useAuditLog = () => {
  return {
    logUserView: (userId: string) => {
      void logAuditEvent({ type: 'user_view', userId });
    },
    logUserModify: (userId: string, action: string, metadata?: Record<string, unknown>) => {
      void logAuditEvent({ type: 'user_modify', userId, action, metadata });
    },
    logWalletAdjust: (userId: string, amount: number, type: string, reason?: string) => {
      void logAuditEvent({
        type: 'wallet_adjust',
        userId,
        metadata: { amount, type, reason },
      });
    },
    logKycForce: (userId: string) => {
      void logAuditEvent({ type: 'kyc_force', userId });
    },
    logPasswordReset: (userId: string) => {
      void logAuditEvent({ type: 'password_reset', userId });
    },
    logPowensAccess: (userId: string) => {
      void logAuditEvent({ type: 'powens_access', userId });
    },
    logTransactionView: (transactionId: string, userId?: string) => {
      void logAuditEvent({ type: 'transaction_view', transactionId, userId });
    },
    logTransactionModify: (transactionId: string, action: string, userId?: string) => {
      void logAuditEvent({ type: 'transaction_modify', transactionId, userId, action });
    },
    logPartnerView: (partnerId: string) => {
      void logAuditEvent({ type: 'partner_view', partnerId });
    },
    logPartnerModify: (partnerId: string, action: string, metadata?: Record<string, unknown>) => {
      void logAuditEvent({ type: 'partner_modify', partnerId, action, metadata });
    },
  };
};

