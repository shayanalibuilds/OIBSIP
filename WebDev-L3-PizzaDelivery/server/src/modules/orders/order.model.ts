import mongoose from 'mongoose';
import { getDbMode } from '../../config/db.js';
import { memory, newId, matches, type MemoryDoc } from '../../shared/db/memory.js';

export type OrderStatus = 'received' | 'in_kitchen' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

export interface OrderItemSnapshot {
  id: string;
  name: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  at: Date;
  note?: string;
}

export interface OrderDoc extends MemoryDoc {
  _id: string;
  userId: string;
  base: OrderItemSnapshot;
  sauce: OrderItemSnapshot;
  cheese: OrderItemSnapshot;
  vegetables: OrderItemSnapshot[];
  quantity: number;
  priceMinor: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new mongoose.Schema<OrderDoc>(
  {
    userId: { type: String, required: true, index: true },
    base: { type: Object, required: true },
    sauce: { type: Object, required: true },
    cheese: { type: Object, required: true },
    vegetables: { type: [Object], default: [] },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    priceMinor: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['received', 'in_kitchen', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'received',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    statusHistory: {
      type: [{ status: String, at: Date, note: String }],
      default: [{ status: 'received', at: new Date() }],
    },
  },
  { timestamps: true },
);

export const OrderModel = mongoose.models.Order ?? mongoose.model<OrderDoc>('Order', schema);

function asDoc(r: unknown): OrderDoc {
  const o = r as OrderDoc;
  return {
    ...o,
    _id: String(o._id),
    vegetables: Array.isArray(o.vegetables) ? o.vegetables : [],
    statusHistory: Array.isArray(o.statusHistory) ? o.statusHistory : [],
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
  } as OrderDoc;
}

export const OrderRepo = {
  async create(doc: Partial<OrderDoc>): Promise<OrderDoc> {
    if (getDbMode() === 'mongo') {
      const r = await OrderModel.create(doc);
      return asDoc(r);
    }
    const now = new Date();
    const rec: OrderDoc = {
      _id: newId(),
      userId: String(doc.userId ?? ''),
      base: (doc.base ?? {}) as OrderItemSnapshot,
      sauce: (doc.sauce ?? {}) as OrderItemSnapshot,
      cheese: (doc.cheese ?? {}) as OrderItemSnapshot,
      vegetables: Array.isArray(doc.vegetables) ? [...doc.vegetables] : [],
      quantity: Number(doc.quantity ?? 1),
      priceMinor: Number(doc.priceMinor ?? 0),
      status: (doc.status ?? 'received') as OrderStatus,
      paymentStatus: (doc.paymentStatus ?? 'unpaid') as PaymentStatus,
      razorpayOrderId: doc.razorpayOrderId ?? null,
      razorpayPaymentId: doc.razorpayPaymentId ?? null,
      statusHistory: doc.statusHistory ?? [{ status: 'received', at: now }],
      createdAt: now,
      updatedAt: now,
    };
    memory.orders.push(rec);
    return { ...rec };
  },

  async findById(id: string): Promise<OrderDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await OrderModel.findById(id).lean()) as unknown as OrderDoc | null;
      return r ? asDoc(r) : null;
    }
    const rec = memory.orders.find((o) => o._id === id) ?? null;
    return rec ? asDoc(rec) : null;
  },

  async findForUser(userId: string): Promise<OrderDoc[]> {
    if (getDbMode() === 'mongo') {
      const r = (await OrderModel.find({ userId }).sort({ createdAt: -1 }).lean()) as unknown as OrderDoc[];
      return r.map(asDoc);
    }
    return memory.orders
      .filter((o) => o.userId === userId)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .map((o) => ({ ...o } as OrderDoc));
  },

  async findAll(filter: Record<string, unknown> = {}): Promise<OrderDoc[]> {
    if (getDbMode() === 'mongo') {
      const r = (await OrderModel.find(filter).sort({ createdAt: -1 }).lean()) as unknown as OrderDoc[];
      return r.map(asDoc);
    }
    return memory.orders
      .filter((o) => matches(o, filter))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      .map((o) => ({ ...o } as OrderDoc));
  },

  async updateById(id: string, patch: Partial<OrderDoc>): Promise<OrderDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await OrderModel.findByIdAndUpdate(id, patch, { new: true }).lean()) as unknown as OrderDoc | null;
      return r ? asDoc(r) : null;
    }
    const rec = memory.orders.find((o) => o._id === id);
    if (!rec) return null;
    Object.assign(rec, patch, { updatedAt: new Date() });
    return { ...rec } as OrderDoc;
  },

  async pushStatus(id: string, status: OrderStatus, note?: string): Promise<OrderDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await OrderModel.findByIdAndUpdate(
        id,
        {
          status,
          $push: { statusHistory: { status, at: new Date(), note } },
        },
        { new: true },
      ).lean()) as unknown as OrderDoc | null;
      return r ? asDoc(r) : null;
    }
    const rec = memory.orders.find((o) => o._id === id) as (OrderDoc & MemoryDoc) | undefined;
    if (!rec) return null;
    rec.status = status;
    const prev = (rec.statusHistory as StatusHistoryEntry[] | undefined) ?? [];
    rec.statusHistory = [...prev, { status, at: new Date(), note }];
    rec.updatedAt = new Date();
    return { ...rec } as OrderDoc;
  },
};
