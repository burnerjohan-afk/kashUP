/**
 * Tests de sécurité - Journalisation d'audit
 * 
 * Ces tests vérifient que le système de journalisation fonctionne correctement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logAuditEvent, useAuditLog } from '@/lib/audit/audit-logger';
import { useAuthStore } from '@/store/auth-store';
import { renderHook, waitFor } from '@testing-library/react';

// Mock de l'API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('Journalisation d\'Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearSession();
    
    useAuthStore.getState().setCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      user: {
        id: 'admin-1',
        email: 'admin@test.com',
        fullName: 'Admin Test',
        role: 'admin',
      },
    });
  });

  describe('logAuditEvent', () => {
    it('devrait logger un événement user_view', async () => {
      const { apiClient } = await import('@/lib/api/client');
      
      await logAuditEvent({
        type: 'user_view',
        userId: 'user-123',
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          'admin/audit/log',
          expect.objectContaining({
            type: 'user_view',
            userId: 'user-123',
            adminId: 'admin-1',
            adminEmail: 'admin@test.com',
          })
        );
      });
    });

    it('devrait logger un événement wallet_adjust avec métadonnées', async () => {
      const { apiClient } = await import('@/lib/api/client');
      
      await logAuditEvent({
        type: 'wallet_adjust',
        userId: 'user-123',
        metadata: {
          amount: 100,
          type: 'credit',
          reason: 'Test adjustment',
        },
      });

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          'admin/audit/log',
          expect.objectContaining({
            type: 'wallet_adjust',
            userId: 'user-123',
            metadata: {
              amount: 100,
              type: 'credit',
              reason: 'Test adjustment',
            },
          })
        );
      });
    });

    it('ne devrait pas bloquer l\'action si le log échoue', async () => {
      const { apiClient } = await import('@/lib/api/client');
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'));

      // Ne devrait pas throw
      await expect(
        logAuditEvent({
          type: 'user_view',
          userId: 'user-123',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('useAuditLog hook', () => {
    it('devrait fournir toutes les fonctions de log', () => {
      const { result } = renderHook(() => useAuditLog());

      expect(result.current.logUserView).toBeDefined();
      expect(result.current.logUserModify).toBeDefined();
      expect(result.current.logWalletAdjust).toBeDefined();
      expect(result.current.logKycForce).toBeDefined();
      expect(result.current.logPasswordReset).toBeDefined();
      expect(result.current.logPowensAccess).toBeDefined();
      expect(result.current.logTransactionView).toBeDefined();
      expect(result.current.logTransactionModify).toBeDefined();
      expect(result.current.logPartnerView).toBeDefined();
      expect(result.current.logPartnerModify).toBeDefined();
    });

    it('devrait logger un accès utilisateur', async () => {
      const { apiClient } = await import('@/lib/api/client');
      const { result } = renderHook(() => useAuditLog());

      result.current.logUserView('user-123');

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          'admin/audit/log',
          expect.objectContaining({
            type: 'user_view',
            userId: 'user-123',
          })
        );
      });
    });

    it('devrait logger un ajustement de wallet', async () => {
      const { apiClient } = await import('@/lib/api/client');
      const { result } = renderHook(() => useAuditLog());

      result.current.logWalletAdjust('user-123', 100, 'credit', 'Test reason');

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          'admin/audit/log',
          expect.objectContaining({
            type: 'wallet_adjust',
            userId: 'user-123',
            metadata: {
              amount: 100,
              type: 'credit',
              reason: 'Test reason',
            },
          })
        );
      });
    });
  });
});

