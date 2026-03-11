import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser, UserRole } from '@/types/auth';

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  user?: AdminUser;
  roles: UserRole[];
  isAuthenticated: boolean;
  /** False jusqu'à ce que persist ait rechargé le state depuis localStorage (évite redirection login au rechargement). */
  hasHydrated: boolean;
  setCredentials: (payload: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }) => void;
  setRoles: (roles: UserRole[]) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: undefined,
      refreshToken: undefined,
      user: undefined,
      roles: [],
      isAuthenticated: false,
      hasHydrated: false,
      setCredentials: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user,
          roles: user ? [user.role] : [],
          isAuthenticated: true,
        }),
      setRoles: (roles) => set({ roles }),
      clearSession: () =>
        set({
          accessToken: undefined,
          refreshToken: undefined,
          user: undefined,
          roles: [],
          isAuthenticated: false,
        }),
    }),
    {
      name: 'kashup-admin-auth',
      // Persistance en localStorage : la session survit au rafraîchissement de la page.
      // Déconnexion après inactivité ou expiration du refresh token côté backend.
      storage: {
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            // Ignorer si localStorage n'est pas disponible
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Ignorer
          }
        },
      },
      // ⚠️ SÉCURITÉ: Ne stocker que l'état minimal nécessaire
      // Les tokens accessToken/refreshToken sont toujours stockés car nécessaires pour les requêtes
      // TODO: Migrer vers cookies HttpOnly côté backend pour une sécurité maximale
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        roles: state.roles,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, err) => {
        useAuthStore.setState({ hasHydrated: true });
      },
      // Au cas où onRehydrateStorage ne serait jamais appelé (localStorage bloqué, iframe, etc.)
      skipHydration: false,
    },
  ),
);

// Fallback : forcer hasHydrated après 1s pour ne jamais bloquer l'affichage (localStorage bloqué, etc.)
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    useAuthStore.setState({ hasHydrated: true });
  }, 1000);
}

