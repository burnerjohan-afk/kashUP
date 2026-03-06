/**
 * Appels API d'authentification (sans token)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  territory?: string | null;
  partnerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type StandardResponse<T> = {
  success: boolean;
  message?: string;
  data: T | null;
};

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const json = await res.json().catch(() => ({})) as StandardResponse<AuthResponse>;
  if (!res.ok) throw new Error(json.message || `Erreur ${res.status}`);
  if (!json.success || json.data === null) throw new Error(json.message || 'Erreur d\'authentification');
  return json.data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => ({})) as StandardResponse<AuthResponse>;
  if (!res.ok) throw new Error(json.message || `Erreur ${res.status}`);
  if (!json.success || json.data === null) throw new Error(json.message || 'Session expirée');
  return json.data;
}
