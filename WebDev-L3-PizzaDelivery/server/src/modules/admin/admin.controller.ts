import type { Response, NextFunction } from 'express';
import { AppError } from '../../shared/utils/AppError.js';
import type { AuthenticatedReq } from '../../shared/middleware/requireAuth.js';
import * as svc from './admin.service.js';
import { patchInventorySchema, changeStatusSchema } from './admin.service.js';
import { auth as authService } from '../auth/auth.service.js';

export async function login(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await authService.login(req.body);
    if (out.user.role !== 'admin') {
      throw AppError.unauthorized('Invalid email or password');
    }
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function listInventory(_req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await svc.listInventory();
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function patchInventory(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const patch = patchInventorySchema.parse(req.body);
    const out = await svc.patchInventory(req.params.id, patch);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function listOrders(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const status = (req.query.status as string | undefined) as
      | 'received'
      | 'in_kitchen'
      | 'out_for_delivery'
      | 'delivered'
      | 'cancelled'
      | undefined;
    const out = await svc.listOrders(status ? { status } : {});
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function changeOrderStatus(req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const input = changeStatusSchema.parse(req.body);
    const out = await svc.changeOrderStatus(req.params.id, input.status, input.note);
    res.json(out);
  } catch (e) {
    next(e);
  }
}
