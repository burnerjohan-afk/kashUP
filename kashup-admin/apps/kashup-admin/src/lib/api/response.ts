import type { StandardResponse, ApiResponse } from '@/types/api';

export class ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode?: number,
    code?: string,
    details?: unknown,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Déroule une réponse StandardResponse (nouveau format kashup-api)
 * Vérifie success et statusCode, lance une erreur si nécessaire
 */
export const unwrapStandardResponse = <T>(response: StandardResponse<T>): T => {
  if (!response.success || response.statusCode >= 400) {
    const fieldErrors = response.meta?.details?.fieldErrors;
    
    // Extraire un message d'erreur plus lisible pour les erreurs Prisma
    let errorMessage = response.message || 'Erreur API';
    
    // Si le message contient des informations Prisma, essayer de les extraire
    if (errorMessage.includes('Prisma') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
      // Essayer d'extraire le nom de la colonne manquante
      const columnMatch = errorMessage.match(/column `([^`]+)` does not exist/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        errorMessage = `Erreur de base de données : la colonne "${columnName}" n'existe pas. Veuillez contacter l'administrateur pour mettre à jour le schéma de la base de données.`;
      } else if (errorMessage.includes('Invalid `prisma')) {
        errorMessage = 'Erreur de base de données : problème de schéma Prisma. Veuillez contacter l\'administrateur.';
      }
    }
    
    throw new ApiError(
      errorMessage,
      response.statusCode,
      response.meta?.details?.code,
      response.meta?.details,
      fieldErrors
    );
  }

  // Pour les tableaux, autoriser un tableau vide ([]), mais rejeter null/undefined
  // Pour les autres types, rejeter null/undefined
  if (response.data === null || response.data === undefined) {
    throw new ApiError('Aucune donnée retournée', response.statusCode);
  }

  return response.data;
};

/**
 * Déroule une réponse ApiResponse (ancien format, pour compatibilité)
 * @deprecated Utiliser unwrapStandardResponse pour le nouveau format
 */
export const unwrapResponse = <T>(response: ApiResponse<T>) => {
  if (response.error) {
    throw new ApiError(response.error.message, undefined, response.error.code, response.error.details);
  }

  return response.data;
};

