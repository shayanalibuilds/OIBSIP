import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/AppError.js';
import { logger } from '../../shared/utils/logger.js';
import { InventoryRepo, type InventoryItemDoc } from '../inventory/inventory.item.model.js';
import { type OrderStatus } from '../orders/order.model.js';
import * as ordersService from '../orders/orders.service.js';
import { sendMail } from '../auth/auth.email.js';
import { bus, Events, type LowStockPayload } from '../../shared/utils/events.js';

export interface AdminInventoryItem {
  id: string;
  name: string;
  slug: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isLow: boolean;
  lastNotifiedAt?: string | null;
  updatedAt: string;
}

function toAdminItem(item: InventoryItemDoc): AdminInventoryItem {
  return {
    id: item._id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    priceMinor: item.priceMinor,
    stock: item.stock,
    lowStockThreshold: item.lowStockThreshold,
    isActive: item.isActive,
    isLow: item.stock <= item.lowStockThreshold,
    lastNotifiedAt: item.lastNotifiedAt ? item.lastNotifiedAt.toISOString() : null,
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function listInventory(): Promise<{ items: AdminInventoryItem[] }> {
  const items = await InventoryRepo.find({});
  return { items: items.map(toAdminItem) };
}

export const patchInventorySchema = z
  .object({
    stock: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    priceMinor: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    name: z.string().trim().min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export async function patchInventory(id: string, patch: z.infer<typeof patchInventorySchema>) {
  const updated = await InventoryRepo.updateById(id, patch);
  if (!updated) throw AppError.notFound('Inventory item not found');
  return { item: toAdminItem(updated) };
}

export async function listOrders(filter: { status?: OrderStatus } = {}) {
  return ordersService.listAllOrders(filter);
}

export const changeStatusSchema = z.object({
  status: z.enum(['received', 'in_kitchen', 'out_for_delivery', 'delivered', 'cancelled']),
  note: z.string().max(200).optional(),
});

export async function changeOrderStatus(orderId: string, next: OrderStatus, note?: string) {
  const updated = await ordersService.changeStatus(orderId, next, note);
  return { order: ordersService.toPublic(updated) };
}

// ---- Low-stock scan ----

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function scanLowStock(): Promise<{ scanned: number; notified: number }> {
  const lowItems = await InventoryRepo.findLowStock();
  let notified = 0;
  for (const item of lowItems) {
    const last = item.lastNotifiedAt ? item.lastNotifiedAt.getTime() : 0;
    if (Date.now() - last < SIX_HOURS_MS) continue;
    const payload: LowStockPayload = {
      itemId: item._id,
      name: item.name,
      stock: item.stock,
      lowStockThreshold: item.lowStockThreshold,
    };
    bus.emit(Events.LowStock, payload);
    try {
      await sendMail({
        to: env.ADMIN_EMAIL,
        subject: `Low stock: ${item.name}`,
        text: `${item.name} is at ${item.stock} units (threshold ${item.lowStockThreshold}).`,
        html: `<p><b>${item.name}</b> is at ${item.stock} units (threshold ${item.lowStockThreshold}).</p>`,
      });
    } catch (err) {
      logger.warn('Low-stock email send failed', { error: (err as Error).message });
    }
    await InventoryRepo.updateById(item._id, { lastNotifiedAt: new Date() });
    notified++;
  }
  return { scanned: lowItems.length, notified };
}
