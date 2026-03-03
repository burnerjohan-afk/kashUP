import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { verifyToken } from '../utils/token';
import { USER_ROLE, UserRole } from '../types/domain';

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Token manquant', 401));
  }

  const token = header.substring('Bearer '.length);
  try {
    const payload = verifyToken(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: (payload.role as UserRole) ?? USER_ROLE.user
    };
    return next();
  } catch (error) {
    return next(new AppError('Token invalide', 401, (error as Error).message));
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentification requise', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Droits insuffisants', 403));
    }

    return next();
  };
};

