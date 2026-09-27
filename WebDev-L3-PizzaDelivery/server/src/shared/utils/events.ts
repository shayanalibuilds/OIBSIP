import { EventEmitter } from 'events';

/**
 * Cross-module event bus. Decouples modules from Socket.IO and cron
 * so business code never imports the transport directly.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export const Events = {
  OrderStatusChanged: 'order:status',
  LowStock: 'inventory:low-stock',
} as const;

export type OrderStatusPayload = {
  orderId: string;
  status: string;
  userId: string;
};

export type LowStockPayload = {
  itemId: string;
  name: string;
  stock: number;
  lowStockThreshold: number;
};
