import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodTypeAny } from 'zod';
import { AppError } from '../utils/errors';

const handleParseResult = <T>(result: ReturnType<AnyZodObject['safeParse']>, next: NextFunction) => {
  if (!result.success) {
    return next(new AppError('Requête invalide', 422, result.error.flatten()));
  }
  return result.data;
};

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = handleParseResult(schema.safeParse(req.body), next);
    if (data) {
      req.body = data;
      next();
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = handleParseResult(schema.safeParse(req.query), next);
    if (data) {
      req.query = data;
      next();
    }
  };
};

export const validateParams = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = handleParseResult(schema.safeParse(req.params), next);
    if (data) {
      req.params = data;
      next();
    }
  };
};


