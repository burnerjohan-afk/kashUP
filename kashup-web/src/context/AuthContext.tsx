'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser } from '../lib/auth-api';
import { login as apiLogin, refresh } from '../lib/auth-api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kashup_access_token',
  REFRESH_TOKEN: 'kashup_refresh_token',
  USER: 'kashup_user',
} as const;

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): Partial<AuthState> {
  if (typeof window === 'undefined') return {};
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const user = userStr ? (JSON.parse(userStr) as AuthUser) : null;
    return { accessToken, user };
  } catch {
    return {};
  }
}

function persist(tokens: { accessToken: string; refreshToken: string }, user: AuthUser) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  });

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const res = await apiLogin({ email, password, rememberMe });
    persist(res.tokens, res.user);
    setState({ user: res.user, accessToken: res.tokens.accessToken, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setState({ user: null, accessToken: null, isLoading: false });
  }, []);

  const tryRefresh = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return null;
    try {
      const res = await refresh(refreshToken);
      persist(res.tokens, res.user);
      setState((s) => ({ ...s, user: res.user, accessToken: res.tokens.accessToken }));
      return res.tokens.accessToken;
    } catch {
      clearStorage();
      setState({ user: null, accessToken: null, isLoading: false });
      return null;
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const current = state.accessToken ?? loadStored().accessToken ?? null;
    if (current) return current;
    return tryRefresh();
  }, [state.accessToken, tryRefresh]);

  useEffect(() => {
    const stored = loadStored();
    if (stored.accessToken && stored.user) {
      setState({
        user: stored.user,
        accessToken: stored.accessToken,
        isLoading: false,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    getAccessToken,
    refreshToken: tryRefresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
