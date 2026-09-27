import { z } from 'zod';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/AppError.js';
import { logger } from '../../shared/utils/logger.js';
import * as ordersService from '../orders/orders.service.js';
import { OrderRepo } from '../orders/order.model.js';
import { bus, Events, type OrderStatusPayload } from '../../shared/utils/events.js';

export const createOrderSchema = z.object({
  orderId: z.string().length(24),
});

export const verifySchema = z.object({
  orderId: z.string().length(24),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

let client: Razorpay | null = null;
function getRazorpay(): Razorpay | null {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  if (client) return client;
  client = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return client;
}

export function isRazorpayConfigured(): boolean {
  return getRazorpay() !== null;
}

export async function createRazorpayOrder(input: { orderId: string }) {
  const order = await ordersService.getOrder(input.orderId);
  if (order.paymentStatus === 'paid') throw AppError.badRequest('Order already paid');
  if (order.status === 'cancelled') throw AppError.badRequest('Order was cancelled');

  const rzp = getRazorpay();
  if (!rzp) {
    throw AppError.internal('Razorpay is not configured on the server');
  }

  const rzpOrder = await rzp.orders.create({
    amount: order.priceMinor,
    currency: 'INR',
    receipt: order._id,
    notes: { orderId: order._id },
  });

  const updated = await OrderRepo.updateById(order._id, {
    razorpayOrderId: rzpOrder.id,
  });
  if (!updated) throw AppError.internal();

  return {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order._id,
  };
}

export async function verifyPayment(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const order = await ordersService.getOrder(input.orderId);
  if (!order.razorpayOrderId || order.razorpayOrderId !== input.razorpayOrderId) {
    throw AppError.badRequest('Razorpay order id mismatch');
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET ?? '')
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  if (expected !== input.razorpaySignature) {
    // Do NOT mark paid. Do NOT decrement stock.
    logger.warn('Razorpay signature mismatch', { orderId: input.orderId });
    throw AppError.badRequest('Payment signature verification failed');
  }

  await ordersService.markOrderPaid(order._id, input.razorpayPaymentId);
  return { orderId: order._id, status: 'paid' };
}

/**
 * Development-only mock payment. Allowed only when NODE_ENV=development AND
 * Razorpay is not configured. Mirrors the post-verify side effects of the
 * real flow: marks the order paid and decrements stock.
 */
export async function devMockSuccess(input: { orderId: string }) {
  if (env.NODE_ENV !== 'development') {
    throw AppError.forbidden('Dev mock is only available in development');
  }
  if (isRazorpayConfigured()) {
    throw AppError.badRequest('Dev mock is disabled while Razorpay keys are configured');
  }
  const order = await ordersService.getOrder(input.orderId);
  if (order.paymentStatus === 'paid') throw AppError.badRequest('Order already paid');
  if (order.status === 'cancelled') throw AppError.badRequest('Order was cancelled');

  const fakePaymentId = 'dev_mock_' + crypto.randomBytes(8).toString('hex');
  await ordersService.markOrderPaid(order._id, fakePaymentId);

  // Emit a status event so the customer sees the same flow as the real verify path.
  const updated = await OrderRepo.findById(order._id);
  if (updated) {
    const payload: OrderStatusPayload = {
      orderId: updated._id,
      status: updated.status,
      userId: updated.userId,
    };
    bus.emit(Events.OrderStatusChanged, payload);
  }

  logger.info('Dev mock payment applied', { orderId: order._id, paymentId: fakePaymentId });
  return { orderId: order._id, status: 'paid', paymentId: fakePaymentId };
}
