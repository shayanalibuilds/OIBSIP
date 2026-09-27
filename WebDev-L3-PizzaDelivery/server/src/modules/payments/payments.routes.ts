import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './payments.controller.js';
import { requireAuth, type AuthenticatedReq } from '../../shared/middleware/requireAuth.js';

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentsRouter = Router();
paymentsRouter.use(paymentLimiter, requireAuth);

paymentsRouter.post('/razorpay/order', (req, res, next) => ctrl.createOrder(req as AuthenticatedReq, res, next));
paymentsRouter.post('/razorpay/verify', (req, res, next) => ctrl.verify(req as AuthenticatedReq, res, next));
paymentsRouter.post('/dev/mock-success', (req, res, next) => ctrl.devMock(req as AuthenticatedReq, res, next));

export default paymentsRouter;
