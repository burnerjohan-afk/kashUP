import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Ressource introuvable', 404));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // S'assurer que la réponse est toujours en JSON, même en cas d'erreur
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }
  // Gérer les erreurs Multer
  const requestId = (req as any).requestId;

  if (err instanceof multer.MulterError) {
    logger.warn({ 
      code: err.code,
      field: err.field,
      message: err.message,
      path: req.path,
      method: req.method 
    }, 'Erreur Multer');
    
    let message = 'Erreur lors de l\'upload du fichier';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Fichier trop volumineux. Taille maximale: 5MB';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Trop de fichiers uploadés';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Champ de fichier inattendu';
    }
    
    return sendError(res, 400, message, {
      code: 'MULTER_ERROR',
      multerCode: err.code,
      field: err.field,
      requestId
    });
  }

  // Gérer les erreurs de type de fichier (erreurs lancées par fileFilter)
  if (err instanceof Error && err.message.includes('Type de fichier non autorisé')) {
    logger.warn({ 
      message: err.message,
      path: req.path,
      method: req.method 
    }, 'Erreur de type de fichier');
    return sendError(res, 400, err.message, {
      code: 'INVALID_FILE_TYPE',
      requestId
    });
  }

  // Gérer les erreurs Zod
  if (err instanceof ZodError) {
    logger.warn({ 
      errors: err.flatten(),
      path: req.path,
      method: req.method 
    }, 'Erreur de validation Zod');
    return sendError(res, 422, 'Requête invalide', { ...err.flatten(), requestId });
  }

  // Gérer les AppError
  if (err instanceof AppError) {
    logger.warn({ 
      status: err.status,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method 
    }, 'AppError capturée');
    return sendError(res, err.status, err.message, { ...(err.details || {}), requestId });
  }

  // Gérer les erreurs non gérées
  const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
  const errorStack = err instanceof Error ? err.stack : undefined;
  const errorName = err instanceof Error ? err.constructor.name : typeof err;
  
  // Vérifier si c'est une erreur Prisma
  const isPrismaError = err && typeof err === 'object' && 'code' in err;
  const prismaCode = isPrismaError ? (err as any).code : undefined;
  const prismaMeta = isPrismaError ? (err as any).meta : undefined;
  
  logger.error({
    requestId,
    error: errorMessage,
    errorName,
    prismaCode,
    prismaMeta,
    stack: errorStack,
    path: req.path,
    method: req.method,
    body: req.body ? Object.keys(req.body) : 'no body',
    query: req.query,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? 'present' : 'missing',
      'content-type': req.headers['content-type']
    }
  }, '❌ Erreur non gérée dans le middleware');

  // Toujours retourner des détails utiles (même en production, mais limités)
  const details: any = {
    code: 'INTERNAL_ERROR',
    errorName,
    requestId,
    ...(prismaCode && { prismaCode, prismaMeta })
  };
  
  // En développement, ajouter plus de détails
  if (process.env.NODE_ENV !== 'production') {
    details.message = errorMessage;
    details.stack = errorStack;
    details.path = req.path;
    details.method = req.method;
  }

  // Message d'erreur plus descriptif
  let userMessage = 'Erreur interne inattendue';
  if (prismaCode) {
    if (prismaCode === 'P2002') {
      userMessage = 'Une entrée avec cette valeur existe déjà';
    } else if (prismaCode === 'P2003') {
      userMessage = 'Référence invalide (clé étrangère)';
    } else {
      userMessage = `Erreur de base de données (${prismaCode})`;
    }
  } else if (errorMessage && errorMessage !== 'Erreur inconnue') {
    // En développement, inclure le message d'erreur original
    if (process.env.NODE_ENV !== 'production') {
      userMessage = `${userMessage}: ${errorMessage}`;
    }
  }

  return sendError(res, 500, userMessage, details);
};

