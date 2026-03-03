import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getLocalIPv4 } from '../utils/network';
import env from '../config/env';

/**
 * GET /api/v1/debug/network
 * Retourne les informations réseau de l'API
 */
export const getNetworkInfo = asyncHandler(async (req: Request, res: Response) => {
  const ipv4 = getLocalIPv4();
  const port = env.PORT || 4000;
  const basePath = '/api/v1';
  
  const origins = ipv4 
    ? [`http://${ipv4}:${port}`, `http://localhost:${port}`]
    : [`http://localhost:${port}`];
  
  const networkInfo = {
    ipv4: ipv4 || null,
    port,
    basePath,
    origins,
    host: req.get('host') || `localhost:${port}`,
    protocol: req.protocol || 'http',
  };
  
  sendSuccess(res, networkInfo, null, 200, 'Informations réseau récupérées avec succès');
});

