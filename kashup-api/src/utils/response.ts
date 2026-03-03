import { Response } from 'express';

export type JsonMeta = Record<string, unknown> | null;

// Ancien format (pour compatibilité)
export type JsonResponse<T> = {
  data: T | null;
  error: {
    message: string;
    details?: unknown;
  } | null;
  meta: JsonMeta;
};

// Nouveau format avec statusCode, success, message, data
export type StandardResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: JsonMeta;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta: JsonMeta = null,
  status = 200,
  message = 'Opération réussie'
) => {
  // Normaliser les réponses imbriquées { data, meta } si aucun meta explicite n'est fourni
  let normalizedData: any = data;
  let normalizedMeta: JsonMeta = meta;
  if (
    !meta &&
    data &&
    typeof data === 'object' &&
    'data' in (data as any) &&
    'meta' in (data as any)
  ) {
    normalizedData = (data as any).data;
    normalizedMeta = { pagination: (data as any).meta };
  }

  // Format standardisé avec statusCode, success, message, data
  const payload: StandardResponse<T> = {
    statusCode: status,
    success: true,
    message,
    data: normalizedData,
    ...(normalizedMeta && { meta: normalizedMeta })
  };
  return res.status(status).json(payload);
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  details?: unknown
) => {
  // Format standardisé avec statusCode, success, message, data
  const payload: StandardResponse<null> = {
    statusCode: status,
    success: false,
    message,
    data: null
  };
  
  if (details) {
    payload.meta = { details };
  }
  
  return res.status(status).json(payload);
};


