import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError.js';

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body) as Record<string, unknown>;
      if (schemas.query) req.query = schemas.query.parse(req.query) as unknown as typeof req.query;
      if (schemas.params) req.params = schemas.params.parse(req.params) as unknown as typeof req.params;
      next();
    } catch (err) {
      next(AppError.badRequest('Validation failed', (err as Error).message));
    }
  };
}

export type { ZodSchema };
