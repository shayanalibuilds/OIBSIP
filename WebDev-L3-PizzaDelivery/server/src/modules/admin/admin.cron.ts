import cron from 'node-cron';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { scanLowStock } from './admin.service.js';

let task: cron.ScheduledTask | null = null;

export function startLowStockCron(): void {
  if (task) return;
  if (!cron.validate(env.LOW_STOCK_CRON)) {
    logger.warn('Invalid LOW_STOCK_CRON expression, skipping schedule', { expr: env.LOW_STOCK_CRON });
    return;
  }
  task = cron.schedule(env.LOW_STOCK_CRON, async () => {
    try {
      const out = await scanLowStock();
      logger.info('Low-stock scan complete', out);
    } catch (err) {
      logger.error('Low-stock scan failed', { error: (err as Error).message });
    }
  });
  logger.info('Low-stock cron scheduled', { expr: env.LOW_STOCK_CRON });
}

export function stopLowStockCron(): void {
  if (task) {
    task.stop();
    task = null;
  }
}
