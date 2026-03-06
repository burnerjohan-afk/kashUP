import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../src/services/auth';
import { getAuthToken, clearAuthToken, setOnSessionInvalidated } from '../src/services/api';
import { ApiError } from '../src/types/api';

type ProviderType = 'email' | 'apple' | 'google';

export type AuthUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  provider: ProviderType;
};

type SignUpPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signUp: (payload: SignUpPayload) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithApple: () => Promise<AuthUser>;
  /** idToken obtenu côté client (ex. via useIdTokenAuthRequest) */
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

function mapApiUserToAuthUser(apiUser: authService.User, provider: ProviderType): AuthUser {
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    provider,
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getAuthToken();
        if (!token?.trim()) {
          setUser(null);
          setLoading(false);
          return;
        }
        const apiUser = await authService.getCurrentUser();
        setUser(mapApiUserToAuthUser(apiUser, 'email'));
      } catch (err) {
        // Ne supprimer le token que si la session est vraiment invalide (401), pas sur erreur réseau / 500
        const is401 =
          err instanceof ApiError && err.statusCode === 401;
        if (is401) {
          await clearAuthToken();
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Quand l'API invalide la session (401 + clear token), synchroniser l'état pour afficher l'écran de connexion
  useEffect(() => {
    setOnSessionInvalidated(() => setUser(null));
    return () => setOnSessionInvalidated(null);
  }, []);

  const signUp = async (payload: SignUpPayload) => {
    const firstName = payload.firstName ?? payload.email.split('@')[0] ?? 'Utilisateur';
    const lastName = payload.lastName ?? 'KashUP';
    const result = await authService.signup({
      email: payload.email,
      password: payload.password,
      firstName,
      lastName,
    });
    const next = mapApiUserToAuthUser(result.user, 'email');
    setUser(next);
    return next;
  };

  const login = async (email: string, password: string) => {
    const result = await authService.login({
      email: email.trim().toLowerCase(),
      password,
    });
    const next = mapApiUserToAuthUser(result.user, 'email');
    setUser(next);
    return next;
  };

  const loginWithApple = async () => {
    const result = await authService.loginWithApple();
    const next = mapApiUserToAuthUser(result.user, 'apple');
    setUser(next);
    return next;
  };

  const loginWithGoogle = async (idToken: string) => {
    const result = await authService.loginWithGoogle(idToken);
    const next = mapApiUserToAuthUser(result.user, 'google');
    setUser(next);
    return next;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, signUp, login, logout, loginWithApple, loginWithGoogle }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


