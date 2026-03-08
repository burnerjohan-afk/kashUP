import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assure qu'un X-Request-Id est présent pour chaque requête et le propage dans les logs.
 * crypto.randomUUID() utilisé pour éviter le module ESM-only "uuid" sur Vercel.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim() !== '' ? incomingId : randomUUID();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

