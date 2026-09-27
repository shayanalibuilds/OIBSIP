import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFound } from './shared/middleware/errorHandler.js';
import { requireAuth, type AuthenticatedReq } from './shared/middleware/requireAuth.js';
import * as authController from './modules/auth/auth.controller.js';
import authRouter from './modules/auth/auth.routes.js';
import catalogRouter from './modules/catalog/catalog.routes.js';
import ordersRouter from './modules/orders/orders.routes.js';
import paymentsRouter from './modules/payments/payments.routes.js';
import adminRouter from './modules/admin/admin.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  const healthLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/api/health', healthLimiter, (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/admin', adminRouter);

  // Top-level /api/me route (per the API contract).
  app.get('/api/me', requireAuth, (req, res, next) =>
    authController.me(req as AuthenticatedReq, res, next),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
