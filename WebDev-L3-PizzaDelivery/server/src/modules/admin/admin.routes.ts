import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './admin.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { requireAuth, type AuthenticatedReq } from '../../shared/middleware/requireAuth.js';
import { requireAdmin } from '../../shared/middleware/requireAdmin.js';
import { adminLoginSchema } from '../auth/auth.validation.js';

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminRouter = Router();

adminRouter.post('/login', adminLoginLimiter, validate({ body: adminLoginSchema }), ctrl.login);

// All admin routes below require an admin access token.
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/inventory', (req, res, next) => ctrl.listInventory(req as AuthenticatedReq, res, next));
adminRouter.patch('/inventory/:id', (req, res, next) => ctrl.patchInventory(req as AuthenticatedReq, res, next));
adminRouter.get('/orders', (req, res, next) => ctrl.listOrders(req as AuthenticatedReq, res, next));
adminRouter.patch('/orders/:id/status', (req, res, next) =>
  ctrl.changeOrderStatus(req as AuthenticatedReq, res, next),
);

export default adminRouter;
