import { z } from 'zod';
import { OrderRepo, type OrderDoc, type OrderStatus } from './order.model.js';
import { resolvePizza } from '../catalog/catalog.service.js';
import { InventoryRepo } from '../inventory/inventory.item.model.js';
import { AppError } from '../../shared/utils/AppError.js';
import { bus, Events, type OrderStatusPayload } from '../../shared/utils/events.js';

export { resolvePizza };

export const createOrderSchema = z.object({
  baseId: z.string().length(24),
  sauceId: z.string().length(24),
  cheeseId: z.string().length(24),
  vegetableIds: z.array(z.string().length(24)).max(8).default([]),
  quantity: z.number().int().min(1).max(20).default(1),
});

export interface OrderPublic {
  id: string;
  status: OrderStatus;
  paymentStatus: string;
  priceMinor: number;
  price: number;
  quantity: number;
  base: { id: string; name: string; priceMinor: number };
  sauce: { id: string; name: string; priceMinor: number };
  cheese: { id: string; name: string; priceMinor: number };
  vegetables: { id: string; name: string; priceMinor: number }[];
  statusHistory: { status: OrderStatus; at: string; note?: string }[];
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

function toPublic(o: OrderDoc): OrderPublic {
  return {
    id: o._id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    priceMinor: o.priceMinor,
    price: o.priceMinor / 100,
    quantity: o.quantity,
    base: { id: o.base.id, name: o.base.name, priceMinor: o.base.priceMinor },
    sauce: { id: o.sauce.id, name: o.sauce.name, priceMinor: o.sauce.priceMinor },
    cheese: { id: o.cheese.id, name: o.cheese.name, priceMinor: o.cheese.priceMinor },
    vegetables: o.vegetables.map((v) => ({ id: v.id, name: v.name, priceMinor: v.priceMinor })),
    statusHistory: (o.statusHistory ?? []).map((h) => ({
      status: h.status,
      at: h.at.toISOString(),
      note: h.note,
    })),
    razorpayOrderId: o.razorpayOrderId ?? null,
    razorpayPaymentId: o.razorpayPaymentId ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export async function createOrder(userId: string, input: z.infer<typeof createOrderSchema>) {
  const { base, sauce, cheese, vegetables, priceMinor } = await resolvePizza(input);

  // Snapshot the per-unit price + names. Total = unit price * quantity.
  const totalMinor = priceMinor * input.quantity;

  // Stock check up-front (decrement happens after payment).
  const all = [base, sauce, cheese, ...vegetables];
  for (const item of all) {
    if (item.stock < input.quantity) {
      throw AppError.conflict(`Insufficient stock for ${item.name}`);
    }
  }

  const order = await OrderRepo.create({
    userId,
    base: { id: base._id, name: base.name, category: 'base', priceMinor: base.priceMinor },
    sauce: { id: sauce._id, name: sauce.name, category: 'sauce', priceMinor: sauce.priceMinor },
    cheese: { id: cheese._id, name: cheese.name, category: 'cheese', priceMinor: cheese.priceMinor },
    vegetables: vegetables.map((v) => ({
      id: v._id,
      name: v.name,
      category: 'vegetable',
      priceMinor: v.priceMinor,
    })),
    quantity: input.quantity,
    priceMinor: totalMinor,
    status: 'received',
    paymentStatus: 'unpaid',
    statusHistory: [{ status: 'received', at: new Date() }],
  });

  return { order: toPublic(order) };
}

export async function listMyOrders(userId: string) {
  const orders = await OrderRepo.findForUser(userId);
  return { orders: orders.map(toPublic) };
}

export async function getOrderForUser(userId: string, orderId: string) {
  const order = await OrderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.userId !== userId) throw AppError.forbidden();
  return { order: toPublic(order) };
}

export async function listAllOrders(filter: { status?: OrderStatus } = {}) {
  const orders = await OrderRepo.findAll(filter.status ? { status: filter.status } : {});
  return { orders: orders.map(toPublic) };
}

export async function getOrder(orderId: string) {
  const order = await OrderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  return order;
}

export async function markOrderPaid(orderId: string, paymentId: string) {
  const order = await OrderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.paymentStatus === 'paid') return order;

  // Decrement stock atomically. If anything would go negative, roll back what we did
  // and refuse to mark paid.
  const items: { id: string; qty: number }[] = [
    { id: order.base.id, qty: order.quantity },
    { id: order.sauce.id, qty: order.quantity },
    { id: order.cheese.id, qty: order.quantity },
    ...order.vegetables.map((v) => ({ id: v.id, qty: order.quantity })),
  ];

  const decremented: { id: string; qty: number; prevStock: number }[] = [];
  try {
    for (const it of items) {
      const before = await InventoryRepo.findById(it.id);
      if (!before) throw new Error('NOT_FOUND');
      if (before.stock < it.qty) throw new Error('INSUFFICIENT_STOCK');
      await InventoryRepo.decrementStock(it.id, it.qty);
      decremented.push({ id: it.id, qty: it.qty, prevStock: before.stock });
    }
  } catch (e) {
    // Roll back already-applied decrements.
    for (const d of decremented) {
      const cur = await InventoryRepo.findById(d.id);
      if (cur) await InventoryRepo.updateById(d.id, { stock: cur.stock + d.qty });
    }
    if ((e as Error).message === 'INSUFFICIENT_STOCK') {
      throw AppError.conflict('Stock changed during checkout. Please retry.');
    }
    throw e;
  }

  const updated = await OrderRepo.updateById(orderId, {
    paymentStatus: 'paid',
    razorpayPaymentId: paymentId,
    status: 'received',
  });
  if (!updated) throw AppError.notFound('Order not found');
  return updated;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['in_kitchen', 'cancelled'],
  in_kitchen: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export async function changeStatus(orderId: string, next: OrderStatus, note?: string) {
  const order = await OrderRepo.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  const allowed = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(next)) {
    throw AppError.badRequest(`Cannot move order from ${order.status} to ${next}`);
  }
  const updated = await OrderRepo.pushStatus(orderId, next, note);
  if (!updated) throw AppError.notFound('Order not found');
  const payload: OrderStatusPayload = { orderId: updated._id, status: updated.status, userId: updated.userId };
  bus.emit(Events.OrderStatusChanged, payload);
  return updated;
}

export { toPublic };
