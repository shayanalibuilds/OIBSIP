import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initDb, closeDb, getDbMode } from './config/db.js';
import { logger } from './shared/utils/logger.js';
import { bus, Events, type OrderStatusPayload } from './shared/utils/events.js';
import { startLowStockCron, stopLowStockCron } from './modules/admin/admin.cron.js';
import { seedDevDataIfNeeded } from './modules/catalog/catalog.devseed.js';

async function bootstrap() {
  await initDb();
  logger.info('DB mode', { mode: getDbMode() });

  if (getDbMode() === 'memory') {
    await seedDevDataIfNeeded();
  }

  const app = createApp();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  io.on('connection', (socket) => {
    logger.info('socket connected', { id: socket.id });

    socket.on('auth', (payload: { userId?: string; role?: string }) => {
      if (payload?.role === 'admin') {
        socket.join('admin');
        logger.debug('socket joined admin', { id: socket.id });
      } else if (payload?.userId) {
        void socket.join(`user:${payload.userId}`);
        logger.debug('socket joined user room', { id: socket.id, userId: payload.userId });
      }
    });

    socket.on('disconnect', () => {
      logger.debug('socket disconnected', { id: socket.id });
    });
  });

  // Bridge internal events to socket emissions.
  bus.on(Events.OrderStatusChanged, (p: OrderStatusPayload) => {
    io.to(`user:${p.userId}`).emit(Events.OrderStatusChanged, p);
    io.to('admin').emit(Events.OrderStatusChanged, p);
  });

  if (env.NODE_ENV !== 'test') {
    startLowStockCron();
  }

  const port = env.PORT;
  server.listen(port, () => {
    logger.info('Ovenly API listening', { port, env: env.NODE_ENV });
  });

  const shutdown = async (sig: string) => {
    logger.info('Shutting down', { signal: sig });
    stopLowStockCron();
    io.close();
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', { error: err?.message, stack: err?.stack });
  process.exit(1);
});
