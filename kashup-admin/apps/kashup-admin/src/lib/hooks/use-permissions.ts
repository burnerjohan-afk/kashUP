/**
 * @deprecated Utiliser @/lib/permissions/permissions à la place
 * Ce fichier est conservé pour compatibilité mais redirige vers le nouveau système
 */
import { useMemo } from 'react';
import type { UserRole } from '@/types/auth';
import { useAuthStore } from '@/store/auth-store';

// Réexporter le nouveau système
export { usePermissions } from '@/lib/permissions/permissions';

// Export de roleBadgeTone pour compatibilité
export const useRoleBadgeTone = () => {
  const roles = useAuthStore((state) => state.roles);

  return useMemo(() => {
    if (roles.includes('admin')) return 'primary';
    if (roles.includes('partner_manager')) return 'success';
    return 'muted';
  }, [roles]);
};

