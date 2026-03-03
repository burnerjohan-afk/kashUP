import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  territory: z.string().optional(),
  phone: z.string().optional()
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

