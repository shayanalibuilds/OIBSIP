import type { Response, NextFunction } from 'express';
import type { AuthenticatedReq } from '../../shared/middleware/requireAuth.js';
import * as svc from './catalog.service.js';

export async function list(_req: AuthenticatedReq, res: Response, next: NextFunction) {
  try {
    const out = await svc.listCatalog();
    res.json(out);
  } catch (e) {
    next(e);
  }
}
