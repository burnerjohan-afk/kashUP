import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

/**
 * Liste des champs sensibles à masquer dans les logs (RGPD Art. 32, ANSSI)
 */
const SENSITIVE_FIELDS = [
  'password',
  'hashedPassword',
  'accessToken',
  'token',
  'refreshToken',
  'secret',
  'iban',
  'cardNumber',
  'cvv',
  'apiKey',
  'clientSecret',
  'encryptionKey'
];

/**
 * Nettoie les données sensibles des logs (RGPD Art. 32)
 * @param data Données à nettoyer
 * @param depth Profondeur de récursion (max 3 niveaux)
 */
const sanitizeData = (data: any, depth = 0): any => {
  if (depth > 3) return '[MAX_DEPTH]'; // Limiter la profondeur pour éviter les boucles
  
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'string') {
    // Si c'est une chaîne JSON, essayer de la parser
    if (data.startsWith('{') || data.startsWith('[')) {
      try {
        const parsed = JSON.parse(data);
        return sanitizeData(parsed, depth + 1);
      } catch {
        // Si ce n'est pas du JSON valide, retourner tel quel
        return data;
      }
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      // Masquer les champs sensibles
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized;
  }
  
  return data;
};

const LOG_REQUESTS = process.env.LOG_REQUESTS === 'true';
const LOG_RESPONSES = process.env.LOG_RESPONSES === 'true';
const SILENT_PATHS = ['/health', '/debug/network', '/api/v1/health', '/api/v1/debug/network'];
const isSilentPath = (path: string) => SILENT_PATHS.some((p) => path === p || path.endsWith(p));

/**
 * Middleware de log (discret par défaut). Ne log pas /health ni /debug/network pour éviter le spam.
 * LOG_REQUESTS=true / LOG_RESPONSES=true pour activer les logs détaillés.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).requestId;
  const silent = isSilentPath(req.path);

  if (LOG_REQUESTS && !silent) {
    const sanitizedBody = req.body ? sanitizeData(req.body) : undefined;
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        'content-type': req.headers['content-type'],
      },
      query: Object.keys(req.query || {}).length ? sanitizeData(req.query) : undefined,
      params: Object.keys(req.params || {}).length ? sanitizeData(req.params) : undefined,
      body: sanitizedBody,
      user: req.user ? { id: req.user.sub, role: req.user.role } : null,
    }, 'Requête entrante');
  }

  const originalSend = res.send;
  res.send = function (body: unknown) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    if (silent) return originalSend.call(this, body);

    try {
      const contentType = res.getHeader('content-type');
      let sanitizedBodyPreview: string | undefined;
      if (typeof body === 'string' && body.length > 0) {
        try {
          const parsed = JSON.parse(body);
          const sanitized = sanitizeData(parsed);
          sanitizedBodyPreview = JSON.stringify(sanitized).substring(0, 200);
        } catch {
          sanitizedBodyPreview = body.substring(0, 100);
        }
      } else {
        sanitizedBodyPreview = body != null ? String(body).substring(0, 100) : undefined;
      }

      const logPayload = {
        requestId,
        method: req.method,
        path: req.path,
        status: statusCode,
        duration: `${duration}ms`,
        ...(isError && sanitizedBodyPreview != null && { bodyPreview: sanitizedBodyPreview }),
      };

      if (isError || LOG_RESPONSES) {
        if (isError) {
          logger.error(logPayload, 'Réponse erreur');
        } else {
          logger.info(logPayload, 'Réponse OK');
        }
      }
      if (isError && contentType && !String(contentType).includes('application/json')) {
        logger.error(
          { requestId, contentType, bodyPreview: sanitizedBodyPreview, path: req.path, method: req.method },
          'Réponse d\'erreur non-JSON'
        );
      }
    } catch (logErr) {
      // Ne jamais faire échouer l'envoi de la réponse à cause du log (évite TypeError pino)
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[requestLogger] Log failed:', logErr);
      }
    }

    return originalSend.call(this, body);
  };

  // Appeler next normalement
  next();
};

