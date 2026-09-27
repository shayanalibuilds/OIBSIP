import mongoose from 'mongoose';
import { getDbMode } from '../../config/db.js';
import { memory, newId, matches, type MemoryDoc } from '../../shared/db/memory.js';

export type UserRole = 'customer' | 'admin';

export interface UserDoc extends MemoryDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  emailVerifyToken?: string | null;
  emailVerifyExpires?: Date | null;
  resetToken?: string | null;
  resetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

export const UserModel = mongoose.models.User ?? mongoose.model<UserDoc>('User', userSchema);

// ---- Repository (routes between Mongo and in-memory) ----

export const UserRepo = {
  async create(doc: Partial<UserDoc>): Promise<UserDoc> {
    if (getDbMode() === 'mongo') {
      const created = (await UserModel.create(doc)) as unknown as UserDoc;
      return { ...created, _id: String(created._id) } as UserDoc;
    }
    const now = new Date();
    const rec: UserDoc = {
      _id: newId(),
      name: doc.name ?? '',
      email: (doc.email ?? '').toLowerCase(),
      passwordHash: doc.passwordHash ?? '',
      role: doc.role ?? 'customer',
      emailVerified: doc.emailVerified ?? false,
      emailVerifyToken: doc.emailVerifyToken ?? null,
      emailVerifyExpires: doc.emailVerifyExpires ?? null,
      resetToken: doc.resetToken ?? null,
      resetExpires: doc.resetExpires ?? null,
      createdAt: now,
      updatedAt: now,
    };
    memory.users.push(rec);
    return { ...rec };
  },

  async findOne(filter: Record<string, unknown>): Promise<UserDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await UserModel.findOne(filter).lean()) as unknown as UserDoc | null;
      return r ? ({ ...r, _id: String(r._id) } as UserDoc) : null;
    }
    const rec = memory.users.find((u) => matches(u, filter)) ?? null;
    return rec ? ({ ...rec } as UserDoc) : null;
  },

  async findById(id: string): Promise<UserDoc | null> {
    return this.findOne({ _id: id });
  },

  async findByEmail(email: string): Promise<UserDoc | null> {
    return this.findOne({ email: email.toLowerCase() });
  },

  async updateById(id: string, patch: Partial<UserDoc>): Promise<UserDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await UserModel.findByIdAndUpdate(id, patch, { new: true }).lean()) as unknown as UserDoc | null;
      return r ? ({ ...r, _id: String(r._id) } as UserDoc) : null;
    }
    const rec = memory.users.find((u) => u._id === id) as (UserDoc & MemoryDoc) | undefined;
    if (!rec) return null;
    Object.assign(rec, patch, { updatedAt: new Date() });
    return { ...rec } as UserDoc;
  },

  async deleteRefreshTokensFor(userId: string): Promise<void> {
    memory.refreshTokens = memory.refreshTokens.filter((t) => t.userId !== userId);
  },
};
