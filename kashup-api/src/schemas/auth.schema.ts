import { z } from 'zod';

const AGE_RANGES = ['18-25', '26-35', '36-50', '50+'] as const;
const GENDERS = ['M', 'F', 'other'] as const;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  territory: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
  ageRange: z.enum(AGE_RANGES).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Le refresh token est requis')
});

export const appleSignInSchema = z.object({
  identityToken: z.string().min(1, 'Le token Apple est requis')
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(1, 'Le token Google est requis')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type AppleSignInInput = z.infer<typeof appleSignInSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;

