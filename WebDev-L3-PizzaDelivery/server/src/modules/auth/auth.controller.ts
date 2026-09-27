import type { Response, NextFunction } from 'express';
import { auth as service } from './auth.service.js';
import { AppError } from '../../shared/utils/AppError.js';
import type { AuthenticatedReq } from '../../shared/middleware/requireAuth.js';

export async function register(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.register(req.body);
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function verifyEmail(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.verifyEmail(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function login(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.login(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.refresh(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function logout(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.logout(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function forgotPassword(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.forgotPassword(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function resetPassword(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await service.resetPassword(req.body);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function me(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const out = await service.me(req.user.id);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
