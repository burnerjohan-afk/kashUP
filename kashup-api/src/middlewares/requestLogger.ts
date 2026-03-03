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

/**
 * Middleware pour logger toutes les requêtes et erreurs
 * Anonymise automatiquement les données sensibles (RGPD Art. 32)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  // Nettoyer le body de la requête avant logging
  const sanitizedBody = req.body ? sanitizeData(req.body) : undefined;

  // Logger la requête entrante
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    url: req.url,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    },
    query: sanitizeData(req.query),
    params: sanitizeData(req.params),
    body: sanitizedBody, // Body nettoyé
    user: req.user ? { id: req.user.sub, role: req.user.role } : null
  }, '📨 Requête entrante');

  // Capturer la réponse
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - startTime;
    
    // Vérifier le Content-Type de la réponse
    const contentType = res.getHeader('content-type');
    
    // Nettoyer le body de la réponse avant logging
    let sanitizedBodyPreview: any = undefined;
    if (typeof body === 'string' && body.length > 0) {
      try {
        // Essayer de parser en JSON pour nettoyer
        const parsed = JSON.parse(body);
        const sanitized = sanitizeData(parsed);
        sanitizedBodyPreview = JSON.stringify(sanitized).substring(0, 200);
      } catch {
        // Si ce n'est pas du JSON, prendre un aperçu limité
        sanitizedBodyPreview = body.substring(0, 100);
      }
    } else if (body) {
      sanitizedBodyPreview = sanitizeData(body);
    }
    
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      contentType: contentType || 'not set',
      duration: `${duration}ms`,
      user: req.user ? { id: req.user.sub, role: req.user.role } : null,
      bodyPreview: sanitizedBodyPreview // Body nettoyé
    }, res.statusCode >= 400 ? '❌ Réponse d\'erreur' : '✅ Réponse réussie');
    
    // Si le Content-Type n'est pas JSON, logger un avertissement
    if (res.statusCode >= 400 && contentType && !String(contentType).includes('application/json')) {
      logger.error({
        requestId,
        contentType,
        bodyPreview: sanitizedBodyPreview,
        path: req.path,
        method: req.method
      }, '⚠️ Réponse d\'erreur non-JSON détectée !');
    }
    
    return originalSend.call(this, body);
  };

  // Appeler next normalement
  next();
};

