import rateLimit from 'express-rate-limit';
import env from '../config/env';

/**
 * Rate limiter pour les endpoints d'authentification
 * Protection contre les attaques par force brute (RGPD Art. 32, ANSSI)
 * 
 * Limite : 5 tentatives par 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 5 : 10, // 5 tentatives en prod, 10 en dev
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
      details: {
        retryAfter: '15 minutes'
      }
    }
  },
  standardHeaders: true, // Retourne rate limit info dans les headers `RateLimit-*`
  legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
  skipSuccessfulRequests: true, // Ne compte pas les requêtes réussies
  skipFailedRequests: false // Compte les requêtes échouées
});

/**
 * Rate limiter général pour l'API
 * Protection contre les abus et DDoS basiques
 * 
 * Limite : 100 requêtes par minute
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.NODE_ENV === 'production' ? 100 : 200, // Plus permissif en dev
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de requêtes. Réessayez dans quelques instants.',
      details: {
        retryAfter: '1 minute'
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Ne pas bloquer les requêtes de santé
  skip: (req) => req.path === '/health' || req.path === '/api/v1/health'
});

/**
 * Rate limiter strict pour les endpoints sensibles (création de compte, reset password)
 * Limite : 3 tentatives par heure
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3, // 3 tentatives max
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de tentatives. Réessayez dans 1 heure.',
      details: {
        retryAfter: '1 hour'
      }
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

