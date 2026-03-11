import { z } from 'zod';
import { postStandardJson, getStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { AdminUser } from '@/types/auth';

// Format de réponse attendu de l'API : { data: { user, tokens }, error, meta }
// Note: expiresIn et refreshExpiresIn peuvent être des strings ou des numbers selon l'API
const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.union([z.number(), z.string().transform((val) => Number(val))]).optional(),
  refreshExpiresIn: z.union([z.number(), z.string().transform((val) => Number(val))]).optional(),
  tokenType: z.string().optional(),
});

const authResponseSchema = z.object({
  user: z.custom<AdminUser>(),
  tokens: tokensSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const passwordResetSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export const login = async (payload: LoginInput) => {
  try {
    if (import.meta.env.DEV) {
      console.log('🔐 Tentative de connexion:', { email: payload.email, url: 'auth/login' });
    }
    
    const response = await postStandardJson<z.infer<typeof authResponseSchema>>('auth/login', payload);
    
    if (import.meta.env.DEV) {
      console.log('📥 Réponse brute de l\'API:', response);
    }
    
    const data = unwrapStandardResponse(response);
    
    if (import.meta.env.DEV) {
      console.log('✅ Données extraites:', data);
    }
    
    const parsed = authResponseSchema.parse(data);
    
    // Transformer le format pour correspondre à ce que le store attend
    return {
      accessToken: parsed.tokens.accessToken,
      refreshToken: parsed.tokens.refreshToken,
      user: parsed.user,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('❌ Erreur lors de la connexion:', error);
    }
    throw error;
  }
};

export const requestPasswordReset = async (payload: PasswordResetInput) => {
  const response = await postStandardJson<null>('auth/password/forgot', payload);
  return unwrapStandardResponse(response);
};

export const fetchCurrentAdmin = async () => {
  const response = await getStandardJson<AdminUser>('admin/me');
  return unwrapStandardResponse(response);
};

