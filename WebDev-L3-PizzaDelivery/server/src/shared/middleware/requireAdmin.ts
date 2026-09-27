import type { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import type { AuthenticatedReq } from './requireAuth.js';

export function requireAdmin(req: AuthenticatedReq, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.role !== 'admin') return next(AppError.forbidden('Admin only'));
  next();
}
