import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL doit être défini'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET doit être défini'),
  REFRESH_TOKEN_SECRET: z.string().min(8, 'REFRESH_TOKEN_SECRET doit être défini'),
  POWENS_DOMAIN: z.string().min(1).default('kashup-sandbox'),
  POWENS_API_URL: z.string().url().default('https://kashup-sandbox.biapi.pro/2.0/'),
  POWENS_CLIENT_ID: z.string().min(1).default('dummy-client-id'),
  POWENS_CLIENT_SECRET: z.string().min(1).default('dummy-client-secret'),
  POWENS_REDIRECT_URI: z.string().url().default('http://localhost:5173/powens/callback'),
  POWENS_CONFIG_KEY: z.string().min(1).default('dummy-config'),
  POWENS_MONITORING_KEY: z.string().min(1).default('dummy-monitoring'),
  POWENS_USERS_KEY: z.string().min(1).default('dummy-users'),
  POWENS_ENCRYPTION_PUBLIC_KEY: z.string().min(1).default('{"e":"AQAB","kid":"dummy","kty":"RSA","n":"dummy"}'),
  POWENS_WEBHOOK_SECRET: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').optional(),
  DRIMIFY_API_URL: z.string().url().default('https://api.drimify.com/v1'),
  DRIMIFY_API_KEY: z.string().min(1).default('dummy-drimify'),
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN doit contenir au moins une origine')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    ),
  MOBILE_WEBHOOK_URL: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || z.string().url().safeParse(val).success,
      { message: 'MOBILE_WEBHOOK_URL doit être une URL valide ou vide' }
    )
    .transform((val) => val || ''),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
});

const env = envSchema.parse(process.env);

export default env;


