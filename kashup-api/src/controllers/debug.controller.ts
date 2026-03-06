import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getLocalIPv4 } from '../utils/network';
import env from '../config/env';

const CACHE_TTL_MS = 60_000; // 1 min
let networkInfoCache: { data: object; expiresAt: number } | null = null;

/**
 * GET /api/v1/debug/network
 * Retourne les informations réseau de l'API (réponse mise en cache 1 min pour limiter les appels répétés)
 */
export const getNetworkInfo = asyncHandler(async (req: Request, res: Response) => {
  const now = Date.now();
  if (networkInfoCache && networkInfoCache.expiresAt > now) {
    return sendSuccess(res, networkInfoCache.data, null, 200, 'Informations réseau récupérées avec succès');
  }

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

  networkInfoCache = { data: networkInfo, expiresAt: now + CACHE_TTL_MS };
  sendSuccess(res, networkInfo, null, 200, 'Informations réseau récupérées avec succès');
});

