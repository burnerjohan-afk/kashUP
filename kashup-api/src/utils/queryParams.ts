import { ParsedQs } from 'qs';

/**
 * Utilitaires pour parser les query params Express en types sûrs
 * Évite les erreurs TypeScript avec ParsedQs
 */

/**
 * Convertit un query param en string ou undefined
 * Accepte ParsedQs (Express) ou ParsedUrlQuery (querystring)
 */
export const toStringParam = (value: string | ParsedQs | string[] | ParsedQs[] | (string | ParsedQs)[] | undefined): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  // Si c'est un objet ParsedQs, essayer de le convertir en string
  if (typeof value === 'object') {
    return undefined; // ParsedQs complexe non supporté
  }
  return undefined;
};

/**
 * Convertit un query param en number ou undefined
 */
export const toNumberParam = (value: string | ParsedQs | string[] | ParsedQs[] | undefined): number | undefined => {
  const str = toStringParam(value);
  if (!str) return undefined;
  const num = Number(str);
  return isNaN(num) ? undefined : num;
};

/**
 * Convertit un query param en boolean ou undefined
 */
export const toBooleanParam = (value: string | ParsedQs | string[] | ParsedQs[] | undefined): boolean | undefined => {
  const str = toStringParam(value);
  if (!str) return undefined;
  return str === 'true' || str === '1';
};

/**
 * Convertit un query param en Date (ISO string) ou undefined
 */
export const toDateParam = (value: string | ParsedQs | string[] | ParsedQs[] | undefined): Date | undefined => {
  const str = toStringParam(value);
  if (!str) return undefined;
  const date = new Date(str);
  return isNaN(date.getTime()) ? undefined : date;
};

