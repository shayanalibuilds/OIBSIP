import type { Response, NextFunction } from 'express';
import { AppError } from '../../shared/utils/AppError.js';
import type { AuthenticatedReq } from '../../shared/middleware/requireAuth.js';
import * as svc from './orders.service.js';
import { createOrderSchema } from './orders.service.js';

export async function create(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const input = createOrderSchema.parse(req.body);
    const out = await svc.createOrder(req.user.id, input);
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function listMine(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const out = await svc.listMyOrders(req.user.id);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function getOne(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const out = await svc.getOrderForUser(req.user.id, req.params.id);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
