import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { requestIdMiddleware } from './middlewares/requestId';
import { apiRateLimiter } from './middlewares/rateLimiter';
import router from './routes';
import { sendSuccess } from './utils/response';

export const createApp = () => {
  const app = express();

  // Configuration CORS pour kashup-admin et kashup-mobile
  const corsOriginList = env.CORS_ORIGIN as string[];
  const allowAll = corsOriginList.includes('*');
  const isDevelopment = env.NODE_ENV === 'development';
  
  // Patterns d'origines autorisées pour Expo/React Native
  const expoDevPatterns = [
    /^exp:\/\/.*$/,                      // Expo Go sur téléphone (toutes les origines exp://)
    /^exp:\/\/localhost:\d+$/,           // Expo dev server (exp://localhost:8081)
    /^http:\/\/localhost:\d+$/,         // Expo web dev (http://localhost:8081, 19000, 19006)
    /^http:\/\/127\.0\.0\.1:\d+$/,     // iOS Simulator
    /^http:\/\/10\.0\.2\.2:\d+$/,      // Android Emulator
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Appareils physiques (IPs locales)
    /^https:\/\/.*\.ngrok\.io$/,        // ngrok
    /^https:\/\/.*\.ngrok-free\.app$/,  // Nouveau domaine ngrok
  ];
  
  // Origines de production depuis les variables d'environnement
  const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  
  // En développement, autoriser toutes les origines pour faciliter les tests
  const corsOptions: cors.CorsOptions = (allowAll || isDevelopment)
    ? { 
        origin: true, // Autoriser toutes les origines en dev
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Source', 'X-Webhook-Event'],
      }
    : {
        origin: (origin, callback) => {
          // Autoriser les requêtes sans origin (mobile apps, Postman, etc.)
          // Les applications mobiles React Native n'envoient pas toujours un header Origin
          if (!origin) {
            return callback(null, true);
          }
          
          // Vérifier si l'origine est dans la liste des origines autorisées
          // CORS_ORIGIN est transformé en tableau dans env.ts
          const allowedOriginsList = env.CORS_ORIGIN as string[];
          if (allowedOriginsList.includes(origin)) {
            return callback(null, true);
          }
          
          // Vérifier si l'origine correspond à un pattern Expo/React Native
          const matchesExpoPattern = expoDevPatterns.some(pattern => pattern.test(origin));
          if (matchesExpoPattern) {
            return callback(null, true);
          }
          
          // Vérifier si l'origine est dans la liste de production
          if (productionOrigins.includes(origin)) {
            return callback(null, true);
          }
          
          // Logger l'origine refusée en développement pour le débogage
          if (env.NODE_ENV !== 'production') {
            console.warn(`⚠️ Origine CORS non autorisée: ${origin}`);
          }
          
          return callback(new Error('Origine CORS non autorisée'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Source', 'X-Webhook-Event'],
      };

  app.use(requestIdMiddleware);
  app.use(cors(corsOptions));
  app.use(requestLogger); // Logger toutes les requêtes AVANT tout autre middleware
  
  // Servir les fichiers statiques (uploads) AVANT Helmet pour éviter les conflits
  // Important : doit être avant Helmet pour que Helmet ne s'applique pas aux fichiers statiques
  const staticMiddleware = express.static('uploads', {
    setHeaders: (res, filePath) => {
      // Définir les headers appropriés pour les images
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === 'png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === 'webp') {
        res.setHeader('Content-Type', 'image/webp');
      } else if (ext === 'gif') {
        res.setHeader('Content-Type', 'image/gif');
      }
      // Cache pour les images (1 an)
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      // Headers CORS pour permettre l'accès depuis le frontend
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  });
  
  // Servir les fichiers statiques /uploads AVANT Helmet
  // Cela garantit que Helmet ne s'appliquera pas aux fichiers statiques
  app.use('/uploads', staticMiddleware);

  // Configuration Helmet renforcée (ANSSI, OWASP)
  // Exclure les routes /uploads pour éviter les problèmes NotSameOrigin
  app.use((req, res, next) => {
    // Ne JAMAIS appliquer Helmet pour les fichiers statiques /uploads
    if (req.path.startsWith('/uploads')) {
      return next();
    }
    
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Nécessaire pour certains frameworks
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:", "http://localhost:*", "http://127.0.0.1:*", "http://192.168.*:*"], // Autoriser les images depuis localhost et IPs LAN
          connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "http://192.168.*:*"], // Autoriser les connexions depuis localhost et IPs LAN
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 an
        includeSubDomains: true,
        preload: true
      },
      frameguard: {
        action: 'deny'
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      }
    })(req, res, next);
  });

  // HTTPS enforcement en production (ANSSI, RGPD Art. 32)
  if (env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      // Vérifier si on est derrière un proxy (Heroku, AWS ALB, Cloudflare, etc.)
      const isSecure = req.secure || 
        req.headers['x-forwarded-proto'] === 'https' ||
        req.headers['x-forwarded-ssl'] === 'on' ||
        req.headers['x-forwarded-port'] === '443';
      
      if (!isSecure) {
        const host = req.headers.host || req.hostname;
        const url = req.originalUrl || req.url;
        return res.redirect(301, `https://${host}${url}`);
      }
      next();
    });
  }
  
  // Timeout global pour toutes les requêtes (évite les blocages)
  app.use((req, res, next) => {
    // Timeout de 25 secondes (inférieur au timeout client de 30s)
    req.setTimeout(25000, () => {
      if (!res.headersSent) {
        res.status(504).json({
          data: null,
          error: {
            message: 'Request timeout - Le serveur a pris trop de temps à répondre',
            code: 'REQUEST_TIMEOUT'
          },
          meta: null
        });
      }
    });
    next();
  });

  // Rate limiting général pour l'API (protection DDoS basique)
  app.use('/api/v1', apiRateLimiter);
  app.use('/', apiRateLimiter); // Aussi pour les routes de compatibilité
  
  // Par défaut, éviter le cache navigateur/proxy (les clients mobiles doivent resynchroniser)
  app.use((req, res, next) => {
    if (!res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });
  
  // Middleware pour s'assurer que toutes les réponses sont en JSON
  app.use((req, res, next) => {
    // S'assurer que le Content-Type est JSON pour toutes les réponses
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function (body) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalJson.call(this, body);
    };
    
    res.send = function (body) {
      // Si ce n'est pas déjà du JSON, s'assurer que c'est du JSON
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalSend.call(this, body);
    };
    
    next();
  });
  
  // Middleware conditionnel pour JSON/URL-encoded
  // IMPORTANT : Ne pas parser multipart/form-data - Multer s'en charge
  // Routes qui utilisent Multer (gérer à la fois JSON et multipart)
  const multerRoutes = ['/partners', '/offers', '/rewards', '/gift-cards'];
  
  app.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    const isMulterRoute = multerRoutes.some(route => req.path.includes(route));
    const isPostOrPatch = ['POST', 'PATCH', 'PUT'].includes(req.method);
    
    // Ignorer multipart/form-data - Multer s'en charge
    if (contentType.includes('multipart/form-data')) {
      return next();
    }
    
    // Pour application/json
    if (contentType.includes('application/json')) {
      // Pour les routes Multer, on essaie de parser avec express.json()
      // Si le parsing échoue (body multipart mal étiqueté), on laisse passer pour que Multer gère
      return express.json()(req, res, (err) => {
        if (err) {
          // Détecter si l'erreur est due à un body multipart mal étiqueté
          const errorMessage = err.message || '';
          const isMultipartError = errorMessage.includes('Unexpected token') && 
              (errorMessage.includes('------') || errorMessage.includes('WebKit') || errorMessage.includes('boundary'));
          
          // Si c'est une route Multer et que l'erreur ressemble à du multipart mal étiqueté,
          // laisser passer pour que Multer gère (même si le body a été partiellement consommé)
          if (isMulterRoute && isPostOrPatch && isMultipartError) {
            // Le body a été partiellement consommé, mais on laisse passer
            // Multer pourra peut-être encore parser, ou le contrôleur gérera l'erreur
            // On log un avertissement mais on ne bloque pas
            console.warn('⚠️ Requête multipart/form-data avec Content-Type: application/json détectée sur route Multer. Laisser passer pour que Multer gère.');
            return next();
          }
          
          // Si ce n'est pas une route Multer ou que l'erreur n'est pas du multipart, retourner l'erreur
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
          }
          
          return res.status(400).json({
            data: null,
            error: {
              message: isMultipartError && isMulterRoute && isPostOrPatch
                ? 'Content-Type incorrect : la requête contient du multipart/form-data mais le header indique application/json. Le navigateur devrait définir automatiquement le Content-Type avec le boundary. La requête sera quand même traitée par Multer.'
                : isMultipartError
                ? 'Content-Type incorrect : la requête contient du multipart/form-data mais le header indique application/json. Utilisez FormData et laissez le navigateur définir le Content-Type automatiquement.'
                : 'Erreur de parsing JSON',
              details: {
                code: isMultipartError ? 'INVALID_CONTENT_TYPE' : 'PARSE_ERROR',
                message: err.message,
                ...(isMultipartError && {
                  expected: 'multipart/form-data',
                  received: contentType,
                  path: req.path,
                  method: req.method,
                  ...(isMulterRoute && isPostOrPatch && {
                    note: 'Route Multer détectée - la requête sera traitée par Multer malgré l\'erreur de parsing'
                  })
                })
              }
            },
            meta: null
          });
        }
        next();
      });
    }
    
    // Pour application/x-www-form-urlencoded, utiliser express.urlencoded()
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return express.urlencoded({ extended: true })(req, res, (err) => {
        if (err) {
          // Erreur de parsing URL-encoded
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
          }
          return res.status(400).json({
            data: null,
            error: {
              message: 'Erreur de parsing URL-encoded',
              details: {
                code: 'PARSE_ERROR',
                message: err.message
              }
            },
            meta: null
          });
        }
        next();
      });
    }
    
    // Pour les autres types ou pas de Content-Type, continuer
    next();
  });
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req, _res) => {
      const path = (req.originalUrl ?? req.url ?? req.path ?? '').split('?')[0].toLowerCase();
      return path.includes('health') || path.includes('debug/network');
    },
  }));

  // Route health check - publique, pas d'auth requise
  // Répond sur /, /health et /api/v1/health
  const healthHandler = (req: express.Request, res: express.Response) => {
    const port = env.PORT || 4000;
    
    res.json({ 
      status: 'ok',
      port: port,
      basePath: '/api/v1'
    });
  };
  
  // Route health sur racine
  app.get('/', healthHandler);
  
  // Route health check
  app.get('/health', healthHandler);
  
  // Route health check versionnée
  app.get('/api/v1/health', healthHandler);

  // Versionnement: /api/v1 est canonique. On garde la racine pour compat.
  app.use('/api/v1', router);
  app.use('/api', router); // Compatibilité avec /api/partners (sans /v1)
  app.use('/', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;


