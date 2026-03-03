import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { serializeResource, serializeList } from '../utils/serializer';

/**
 * Handler générique pour ressources non implémentées (501)
 */
export const notImplementedHandler = asyncHandler(async (_req: Request, res: Response) => {
  throw new AppError('Cette ressource n\'est pas encore implémentée', 501, {
    code: 'NOT_IMPLEMENTED',
    message: 'La ressource existe mais les opérations CRUD ne sont pas encore disponibles'
  });
});

/**
 * Handler générique pour liste de ressources (GET /api/v1/<resource>)
 * Utilise un service fourni
 */
export function createListHandler<T>(
  serviceFn: (params: any) => Promise<{ data: T[]; meta?: any }>,
  resourceType: 'partner' | 'user' | 'transaction' = 'partner'
) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { parseListParams } = await import('../utils/listing');
    const listParams = parseListParams(req.query);
    const result = await serviceFn(listParams);
    
    // Sérialiser selon le contexte (public vs admin)
    const serialized = serializeList(req, result.data as Record<string, any>[], resourceType);
    
    sendSuccess(res, serialized, result.meta || null, 200);
  });
}

/**
 * Handler générique pour détail d'une ressource (GET /api/v1/<resource>/:id)
 */
export function createGetByIdHandler<T>(
  serviceFn: (id: string) => Promise<T>,
  resourceType: 'partner' | 'user' | 'transaction' = 'partner'
) {
  return asyncHandler(async (req: Request, res: Response) => {
    const resource = await serviceFn(req.params.id);
    const serialized = serializeResource(req, resource as any, resourceType);
    sendSuccess(res, serialized, null, 200);
  });
}

