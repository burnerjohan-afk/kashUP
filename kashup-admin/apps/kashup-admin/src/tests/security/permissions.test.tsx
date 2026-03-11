/**
 * Tests de sécurité - Permissions
 * 
 * Ces tests vérifient que le système de permissions fonctionne correctement
 * pour différents rôles utilisateur.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/store/auth-store';
import { usePermissions } from '@/lib/permissions/permissions';
import { PermissionGuard } from '@/lib/permissions/permissions';
import type { UserRole } from '@/types/auth';

// Composant de test pour vérifier les permissions
const TestComponent = ({ permission }: { permission: string }) => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission as any) ? <div>Accès autorisé</div> : <div>Accès refusé</div>;
};

describe('Système de Permissions', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    useAuthStore.getState().clearSession();
  });

  describe('Rôle Admin', () => {
    beforeEach(() => {
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

    it('devrait avoir toutes les permissions', () => {
      const { hasPermission } = usePermissions();
      
      expect(hasPermission('users:view')).toBe(true);
      expect(hasPermission('users:view_email')).toBe(true);
      expect(hasPermission('users:view_sensitive')).toBe(true);
      expect(hasPermission('users:modify')).toBe(true);
      expect(hasPermission('users:modify_wallet')).toBe(true);
      expect(hasPermission('users:modify_kyc')).toBe(true);
      expect(hasPermission('users:reset_password')).toBe(true);
      expect(hasPermission('powens:view')).toBe(true);
      expect(hasPermission('transactions:view')).toBe(true);
      expect(hasPermission('partners:view')).toBe(true);
    });

    it('devrait afficher le contenu protégé', () => {
      render(
        <PermissionGuard permission="users:view_email">
          <div>Email visible</div>
        </PermissionGuard>
      );
      
      expect(screen.getByText('Email visible')).toBeInTheDocument();
    });
  });

  describe('Rôle Support', () => {
    beforeEach(() => {
      useAuthStore.getState().setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: {
          id: 'support-1',
          email: 'support@test.com',
          fullName: 'Support Test',
          role: 'support',
        },
      });
    });

    it('devrait avoir les permissions de lecture seule', () => {
      const { hasPermission } = usePermissions();
      
      expect(hasPermission('users:view')).toBe(true);
      expect(hasPermission('users:view_email')).toBe(true);
      expect(hasPermission('users:view_sensitive')).toBe(false); // Pas de données sensibles
      expect(hasPermission('users:modify')).toBe(false);
      expect(hasPermission('users:modify_wallet')).toBe(false);
      expect(hasPermission('users:modify_kyc')).toBe(false);
      expect(hasPermission('users:reset_password')).toBe(false);
      expect(hasPermission('powens:view')).toBe(false); // Pas d'accès Powens
    });

    it('ne devrait pas afficher les données sensibles', () => {
      render(
        <PermissionGuard 
          permission="users:view_sensitive"
          fallback={<div>Données masquées</div>}
        >
          <div>Données sensibles</div>
        </PermissionGuard>
      );
      
      expect(screen.getByText('Données masquées')).toBeInTheDocument();
      expect(screen.queryByText('Données sensibles')).not.toBeInTheDocument();
    });
  });

  describe('Rôle Partner Manager', () => {
    beforeEach(() => {
      useAuthStore.getState().setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: {
          id: 'partner-1',
          email: 'partner@test.com',
          fullName: 'Partner Test',
          role: 'partner_manager',
        },
      });
    });

    it('devrait avoir accès uniquement aux partenaires', () => {
      const { hasPermission } = usePermissions();
      
      expect(hasPermission('users:view')).toBe(false);
      expect(hasPermission('users:view_email')).toBe(false);
      expect(hasPermission('partners:view')).toBe(true);
      expect(hasPermission('partners:modify')).toBe(true);
      expect(hasPermission('transactions:view')).toBe(true);
      expect(hasPermission('offers:view')).toBe(true);
      expect(hasPermission('offers:modify')).toBe(true);
    });

    it('ne devrait pas accéder aux utilisateurs', () => {
      render(
        <PermissionGuard 
          permission="users:view"
          fallback={<div>Accès non autorisé</div>}
        >
          <div>Liste utilisateurs</div>
        </PermissionGuard>
      );
      
      expect(screen.getByText('Accès non autorisé')).toBeInTheDocument();
    });
  });

  describe('PermissionGuard', () => {
    beforeEach(() => {
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

    it('devrait afficher le fallback si pas de permission', () => {
      useAuthStore.getState().setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: {
          id: 'support-1',
          email: 'support@test.com',
          fullName: 'Support Test',
          role: 'support',
        },
      });

      render(
        <PermissionGuard 
          permission="users:modify_wallet"
          fallback={<div>Action non autorisée</div>}
        >
          <div>Formulaire wallet</div>
        </PermissionGuard>
      );
      
      expect(screen.getByText('Action non autorisée')).toBeInTheDocument();
    });

    it('devrait afficher null si pas de fallback', () => {
      useAuthStore.getState().setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: {
          id: 'support-1',
          email: 'support@test.com',
          fullName: 'Support Test',
          role: 'support',
        },
      });

      const { container } = render(
        <PermissionGuard permission="users:modify_wallet">
          <div>Formulaire wallet</div>
        </PermissionGuard>
      );
      
      expect(container.firstChild).toBeNull();
    });
  });
});

