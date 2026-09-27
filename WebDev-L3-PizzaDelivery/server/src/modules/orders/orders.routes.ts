import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './orders.controller.js';
import { requireAuth, type AuthenticatedReq } from '../../shared/middleware/requireAuth.js';

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const ordersRouter = Router();
ordersRouter.use(orderLimiter, requireAuth);

ordersRouter.post('/', (req, res, next) => ctrl.create(req as AuthenticatedReq, res, next));
ordersRouter.get('/', (req, res, next) => ctrl.listMine(req as AuthenticatedReq, res, next));
ordersRouter.get('/:id', (req, res, next) => ctrl.getOne(req as AuthenticatedReq, res, next));

export default ordersRouter;
