import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { env } from '../../config/env.js';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('Route not found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code ?? 'ERROR',
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  if (env.NODE_ENV !== 'test') logger.error('Unhandled error', { message, stack: (err as Error)?.stack });
  if (env.NODE_ENV === 'production') {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  }
  return res.status(500).json({ error: { code: 'INTERNAL', message, stack: (err as Error)?.stack } });
}
