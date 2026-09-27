import mongoose from 'mongoose';
import { getDbMode } from '../../config/db.js';
import { memory, newId, matches, type MemoryDoc } from '../../shared/db/memory.js';

export type Category = 'base' | 'sauce' | 'cheese' | 'vegetable';

export interface InventoryItemDoc extends MemoryDoc {
  _id: string;
  name: string;
  slug: string;
  category: Category;
  priceMinor: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  lastNotifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new mongoose.Schema<InventoryItemDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, index: true },
    category: { type: String, enum: ['base', 'sauce', 'cheese', 'vegetable'], required: true, index: true },
    priceMinor: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 20, min: 0 },
    isActive: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const InventoryItemModel =
  mongoose.models.InventoryItem ?? mongoose.model<InventoryItemDoc>('InventoryItem', schema);

function asDoc(r: unknown): InventoryItemDoc {
  const o = r as InventoryItemDoc;
  return { ...o, _id: String(o._id) } as InventoryItemDoc;
}

export const InventoryRepo = {
  async create(doc: Partial<InventoryItemDoc>): Promise<InventoryItemDoc> {
    if (getDbMode() === 'mongo') {
      const r = await InventoryItemModel.create(doc);
      return asDoc(r);
    }
    const now = new Date();
    const rec: InventoryItemDoc = {
      _id: newId(),
      name: String(doc.name ?? ''),
      slug: String(doc.slug ?? ''),
      category: (doc.category ?? 'base') as Category,
      priceMinor: Number(doc.priceMinor ?? 0),
      stock: Number(doc.stock ?? 0),
      lowStockThreshold: Number(doc.lowStockThreshold ?? 20),
      isActive: doc.isActive ?? true,
      lastNotifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    memory.catalog.push(rec);
    return { ...rec };
  },

  async findOne(filter: Record<string, unknown>): Promise<InventoryItemDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await InventoryItemModel.findOne(filter).lean()) as unknown as InventoryItemDoc | null;
      return r ? asDoc(r) : null;
    }
    const rec = memory.catalog.find((c) => matches(c, filter)) ?? null;
    return rec ? ({ ...rec } as InventoryItemDoc) : null;
  },

  async findById(id: string): Promise<InventoryItemDoc | null> {
    return this.findOne({ _id: id });
  },

  async findBySlug(slug: string): Promise<InventoryItemDoc | null> {
    return this.findOne({ slug });
  },

  async find(filter: Record<string, unknown> = {}): Promise<InventoryItemDoc[]> {
    if (getDbMode() === 'mongo') {
      const r = (await InventoryItemModel.find(filter)
        .sort({ category: 1, name: 1 })
        .lean()) as unknown as InventoryItemDoc[];
      return r.map(asDoc);
    }
    return memory.catalog
      .filter((c) => matches(c, filter))
      .sort((a, b) => {
        const ac = String(a.category);
        const bc = String(b.category);
        if (ac !== bc) return ac.localeCompare(bc);
        return String(a.name).localeCompare(String(b.name));
      })
      .map((c) => ({ ...c } as InventoryItemDoc));
  },

  async findActive(): Promise<InventoryItemDoc[]> {
    return this.find({ isActive: true });
  },

  async findLowStock(): Promise<InventoryItemDoc[]> {
    if (getDbMode() === 'mongo') {
      const r = (await InventoryItemModel.find({
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        isActive: true,
      }).lean()) as unknown as InventoryItemDoc[];
      return r.map(asDoc);
    }
    return memory.catalog
      .filter((c) => c.isActive && Number(c.stock) <= Number(c.lowStockThreshold))
      .map((c) => ({ ...c } as InventoryItemDoc));
  },

  async updateById(id: string, patch: Partial<InventoryItemDoc>): Promise<InventoryItemDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await InventoryItemModel.findByIdAndUpdate(id, patch, { new: true }).lean()) as unknown as InventoryItemDoc | null;
      return r ? asDoc(r) : null;
    }
    const rec = memory.catalog.find((c) => c._id === id);
    if (!rec) return null;
    Object.assign(rec, patch, { updatedAt: new Date() });
    return { ...rec } as InventoryItemDoc;
  },

  async decrementStock(id: string, qty: number): Promise<InventoryItemDoc> {
    if (getDbMode() === 'mongo') {
      const r = (await InventoryItemModel.findOneAndUpdate(
        { _id: id, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
      ).lean()) as unknown as InventoryItemDoc | null;
      if (!r) throw new Error('INSUFFICIENT_STOCK');
      return asDoc(r);
    }
    const rec = memory.catalog.find((c) => c._id === id);
    if (!rec) throw new Error('NOT_FOUND');
    if (Number(rec.stock) < qty) throw new Error('INSUFFICIENT_STOCK');
    rec.stock = Number(rec.stock) - qty;
    rec.updatedAt = new Date();
    return { ...rec } as InventoryItemDoc;
  },

  async deleteMany(filter: Record<string, unknown> = {}): Promise<number> {
    if (getDbMode() === 'mongo') {
      const r = await InventoryItemModel.deleteMany(filter);
      return r.deletedCount ?? 0;
    }
    const before = memory.catalog.length;
    memory.catalog = memory.catalog.filter((c) => !matches(c, filter));
    return before - memory.catalog.length;
  },
};
