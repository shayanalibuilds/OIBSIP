import type { Response, NextFunction } from 'express';
import { AppError } from '../../shared/utils/AppError.js';
import type { AuthenticatedReq } from '../../shared/middleware/requireAuth.js';
import * as svc from './payments.service.js';
import { createOrderSchema, verifySchema } from './payments.service.js';

export async function createOrder(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const input = createOrderSchema.parse(req.body);
    const out = await svc.createRazorpayOrder(input);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function verify(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const input = verifySchema.parse(req.body);
    const out = await svc.verifyPayment(input);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function devMock(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw AppError.unauthorized();
    const input = createOrderSchema.parse(req.body);
    const out = await svc.devMockSuccess(input);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
