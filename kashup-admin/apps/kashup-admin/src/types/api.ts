/**
 * Types pour les réponses API standardisées
 * Alignés sur le contrat API backend
 * 
 * ⚠️ ARCHITECTURE: Format de réponse { data, error, meta }
 * Voir ARCHITECTURE_COMMUNICATION_KASHUP.md pour la référence complète
 */

/**
 * Format de réponse standardisé de kashup-api (NOUVEAU FORMAT)
 * Tous les endpoints retournent ce format selon ARCHITECTURE_COMMUNICATION_KASHUP.md
 */
export type ApiResponseFormat<T> = {
  data: T | T[] | null;
  error: {
    message: string;
    code: string;
    details?: any;
  } | null;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    [key: string]: any;
  } | null;
};

/**
 * Format de réponse standardisé de kashup-api (LEGACY - pour compatibilité)
 * @deprecated Utiliser ApiResponseFormat à la place
 */
export type StandardResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    details?: {
      code?: string;
      fieldErrors?: Record<string, string[]>;
      [key: string]: unknown;
    };
    requestId?: string;
    [key: string]: unknown;
  };
};

/**
 * Format normalisé pour les hooks API
 * Extrait data et meta.pagination du StandardResponse
 */
export type ApiResponse<T> = {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    requestId?: string;
    [key: string]: unknown;
  };
};

/**
 * Format d'erreur API
 */
export type ApiError = {
  statusCode: number;
  success: false;
  message: string;
  meta?: {
    details?: {
      code?: string;
      field?: string;
      [key: string]: unknown;
    };
  };
};

/**
 * Paramètres de pagination pour les listes
 */
export type ListParams = {
  page?: number;
  pageSize?: number;
  sort?: string; // Ex: "-updatedAt" pour tri décroissant
  updatedSince?: string; // ISO8601 pour delta sync
};

/**
 * Type legacy pour compatibilité (sera progressivement remplacé par StandardResponse)
 * @deprecated Utiliser StandardResponse à la place
 */
export type LegacyApiResponse<T> = {
  data: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  } | null;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
    };
    [key: string]: unknown;
  };
};
