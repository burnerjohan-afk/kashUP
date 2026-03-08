/**
 * Génère une chaîne alphanumérique (compatible CommonJS sur Vercel).
 * Remplace nanoid (ESM-only) pour éviter les erreurs sur Vercel.
 */
import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomAlphanumeric(length: number = 21): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}
