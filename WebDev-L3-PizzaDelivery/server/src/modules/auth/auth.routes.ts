import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './auth.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  logoutSchema,
} from './auth.validation.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Too many auth attempts, try again later' } },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), ctrl.register);
authRouter.post('/verify-email', authLimiter, validate({ body: verifyEmailSchema }), ctrl.verifyEmail);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), ctrl.login);
authRouter.post('/refresh', authLimiter, validate({ body: refreshSchema }), ctrl.refresh);
authRouter.post('/logout', authLimiter, validate({ body: logoutSchema }), ctrl.logout);
authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), ctrl.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), ctrl.resetPassword);

export default authRouter;
