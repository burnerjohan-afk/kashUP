/**
 * Système de permissions granulaires pour contrôle d'accès (RBAC)
 * Conforme RGPD: principe de minimisation des données
 */

import { useMemo, type ReactNode } from 'react';
import type { UserRole } from '@/types/auth';
import { useAuthStore } from '@/store/auth-store';

export type Permission =
  // Utilisateurs
  | 'users:view'
  | 'users:view_email'
  | 'users:view_sensitive' // Âge, genre, données sensibles
  | 'users:modify'
  | 'users:modify_wallet'
  | 'users:modify_kyc'
  | 'users:reset_password'
  // Données bancaires (DSP2)
  | 'powens:view'
  | 'powens:modify'
  // Transactions
  | 'transactions:view'
  | 'transactions:modify'
  | 'transactions:flag'
  // Partenaires
  | 'partners:view'
  | 'partners:modify'
  // Statistiques
  | 'statistics:view'
  | 'statistics:export'
  // Récompenses
  | 'rewards:view'
  | 'rewards:modify'
  // Offres
  | 'offers:view'
  | 'offers:modify';

/**
 * Mapping des permissions par rôle
 * Conforme au principe de moindre privilège
 */
export const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  admin: [
    // Accès complet (avec restrictions pour données sensibles)
    'users:view',
    'users:view_email',
    'users:view_sensitive',
    'users:modify',
    'users:modify_wallet',
    'users:modify_kyc',
    'users:reset_password',
    'powens:view',
    'powens:modify',
    'transactions:view',
    'transactions:modify',
    'transactions:flag',
    'partners:view',
    'partners:modify',
    'statistics:view',
    'statistics:export',
    'rewards:view',
    'rewards:modify',
    'offers:view',
    'offers:modify',
  ],
  support: [
    // Accès lecture seule aux utilisateurs et transactions
    'users:view',
    'users:view_email',
    // Pas d'accès aux données sensibles (âge, genre)
    'transactions:view',
    'partners:view',
    'statistics:view',
    'rewards:view',
    'offers:view',
  ],
  partner_manager: [
    // Accès limité aux partenaires et transactions associées
    'partners:view',
    'partners:modify',
    'transactions:view',
    'statistics:view',
    'offers:view',
    'offers:modify',
  ],
};

/**
 * Hook pour vérifier les permissions
 */
export const usePermissions = () => {
  const roles = useAuthStore((state) => state.roles);

  const permissions = useMemo(() => {
    const all: Permission[] = [];
    roles.forEach((role) => {
      const rolePermissions = PERMISSIONS_BY_ROLE[role] || [];
      all.push(...rolePermissions);
    });
    // Dédupliquer
    return [...new Set(all)];
  }, [roles]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every((perm) => permissions.includes(perm));
  };

  // Compatibilité avec l'ancien système (hasRole)
  const hasRole = (allowed: UserRole | UserRole[]) => {
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return list.some((role) => roles.includes(role));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    roles,
    hasRole, // Compatibilité
  };
};

/**
 * Composant guard pour protéger l'affichage selon les permissions
 */
export const PermissionGuard = ({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission | Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  const { hasPermission, hasAnyPermission } = usePermissions();
  const hasAccess = Array.isArray(permission)
    ? hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

