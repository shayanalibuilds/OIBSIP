import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../utils/AppError.js';

export type AuthenticatedReq = Request & {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
    emailVerified: boolean;
  };
};

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'customer' | 'admin';
  emailVerified: boolean;
  type: 'access';
}

export function requireAuth(req: AuthenticatedReq, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized('Missing or malformed Authorization header'));
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') {
      return next(AppError.unauthorized('Invalid token type'));
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      emailVerified: payload.emailVerified,
    };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired access token'));
  }
}
