/**
 * Types pour les réponses standardisées de l'API kashup-api
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ErrorDetails {
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  details?: ErrorDetails;
}

export interface StandardResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: ResponseMeta;
}

/**
 * Classe d'erreur personnalisée pour les erreurs API
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Extrait les données d'une réponse standardisée
 * Lance une ApiError si success === false ou statusCode >= 400
 */
export function unwrapStandardResponse<T>(
  response: StandardResponse<T>
): T {
  if (!response.success || response.statusCode >= 400) {
    const code = response.meta?.details?.code;
    const fieldErrors = response.meta?.details?.fieldErrors;
    throw new ApiError(
      response.message || 'Une erreur est survenue',
      response.statusCode,
      code,
      fieldErrors
    );
  }

  if (response.data === null) {
    throw new ApiError(
      'Aucune donnée retournée',
      response.statusCode || 500
    );
  }

  return response.data;
}

