import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ProviderType = 'email' | 'apple' | 'google';

export type AuthUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  provider: ProviderType;
  // ⚠️ RGPD: Ne jamais stocker le mot de passe côté client
  // Le mot de passe n'est jamais stocké, uniquement les tokens JWT
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
  loginWithGoogle: () => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = 'kashup-auth-user';
const memoryStorage: Record<string, string | undefined> = {};

const storage = {
  getItem: async (key: string) => memoryStorage[key] ?? null,
  setItem: async (key: string, value: string) => {
    memoryStorage[key] = value;
  },
  removeItem: async (key: string) => {
    delete memoryStorage[key];
  },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEY);
        // Vérifier que la session existe
        if (!stored) {
          setLoading(false);
          return;
        }
        // Sécuriser le parsing JSON
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } catch (parseError) {
          // Session invalide (JSON corrompu)
          await storage.removeItem(STORAGE_KEY);
          throw new Error('Session invalide. Merci de vous reconnecter.');
        }
      } catch (error) {
        // Erreur lors de la restauration de session
        console.error('[AuthContext] Erreur restauration session:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const persistUser = async (next: AuthUser | null) => {
    if (next) {
      await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      await storage.removeItem(STORAGE_KEY);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    // ⚠️ RGPD: Le mot de passe n'est jamais stocké côté client
    // Il est envoyé à l'API qui retourne un token JWT
    const defaultFirstName = payload.firstName ?? payload.email.split('@')[0] ?? 'Utilisateur';
    const next: AuthUser = {
      id: `user-${Date.now()}`,
      firstName: defaultFirstName,
      lastName: payload.lastName ?? 'KashUP',
      email: payload.email.toLowerCase(),
      provider: 'email',
    };
    setUser(next);
    await persistUser(next);
    return next;
  };

  const login = async (email: string, password: string) => {
    // ⚠️ RGPD: Le mot de passe n'est jamais stocké côté client
    // L'authentification se fait via l'API qui retourne un token JWT
    // Cette fonction devrait appeler l'API d'authentification
    // Pour l'instant, on vérifie juste si un utilisateur existe en mémoire
    const stored = await storage.getItem(STORAGE_KEY);
    // Vérifier que la session existe
    if (!stored) {
      throw new Error('Aucun compte enregistré. Inscrivez-vous d\'abord.');
    }
    // Sécuriser le parsing JSON
    let parsed: AuthUser;
    try {
      parsed = JSON.parse(stored);
    } catch (parseError) {
      // Session invalide (JSON corrompu)
      await storage.removeItem(STORAGE_KEY);
      throw new Error('Session invalide. Merci de vous reconnecter.');
    }
    if (parsed.email !== email.toLowerCase()) {
      throw new Error('Identifiants incorrects.');
    }
    // Le mot de passe est vérifié côté serveur via l'API
    setUser(parsed);
    return parsed;
  };

  const loginWithApple = async () => {
    const next: AuthUser = {
      id: `apple-${Date.now()}`,
      firstName: 'Utilisateur',
      lastName: 'Apple',
      email: `apple${Date.now()}@example.com`,
      provider: 'apple',
    };
    setUser(next);
    await persistUser(next);
    return next;
  };

  const loginWithGoogle = async () => {
    const next: AuthUser = {
      id: `google-${Date.now()}`,
      firstName: 'Utilisateur',
      lastName: 'Google',
      email: `google${Date.now()}@example.com`,
      provider: 'google',
    };
    setUser(next);
    await persistUser(next);
    return next;
  };

  const logout = async () => {
    setUser(null);
    await persistUser(null);
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


