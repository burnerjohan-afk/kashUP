import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

/**
 * Assure qu'un X-Request-Id est présent pour chaque requête et le propage dans les logs.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim() !== '' ? incomingId : uuid();

  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

