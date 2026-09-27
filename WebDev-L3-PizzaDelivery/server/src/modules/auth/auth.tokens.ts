import mongoose from 'mongoose';
import { getDbMode } from '../../config/db.js';
import { memory, newId, matches, type MemoryDoc } from '../../shared/db/memory.js';

export interface RefreshTokenDoc extends MemoryDoc {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const schema = new mongoose.Schema<RefreshTokenDoc>(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const RefreshTokenModel =
  mongoose.models.RefreshToken ?? mongoose.model<RefreshTokenDoc>('RefreshToken', schema);

export const RefreshTokenRepo = {
  async create(doc: Partial<RefreshTokenDoc>): Promise<RefreshTokenDoc> {
    if (getDbMode() === 'mongo') {
      const r = (await RefreshTokenModel.create(doc)) as unknown as RefreshTokenDoc;
      return { ...r, _id: String(r._id) } as RefreshTokenDoc;
    }
    const rec: RefreshTokenDoc = {
      _id: newId(),
      userId: String(doc.userId ?? ''),
      tokenHash: String(doc.tokenHash ?? ''),
      expiresAt: doc.expiresAt ?? new Date(),
      revoked: false,
      createdAt: new Date(),
    };
    memory.refreshTokens.push(rec);
    return { ...rec };
  },

  async findByHash(hash: string): Promise<RefreshTokenDoc | null> {
    if (getDbMode() === 'mongo') {
      const r = (await RefreshTokenModel.findOne({ tokenHash: hash, revoked: false }).lean()) as unknown as RefreshTokenDoc | null;
      return r ? ({ ...r, _id: String(r._id) } as RefreshTokenDoc) : null;
    }
    const rec = memory.refreshTokens.find((t) => matches(t, { tokenHash: hash, revoked: false })) ?? null;
    return rec ? ({ ...rec } as RefreshTokenDoc) : null;
  },

  async revoke(hash: string): Promise<void> {
    if (getDbMode() === 'mongo') {
      await RefreshTokenModel.updateOne({ tokenHash: hash }, { revoked: true });
      return;
    }
    const rec = memory.refreshTokens.find((t) => t.tokenHash === hash);
    if (rec) rec.revoked = true;
  },

  async revokeAllForUser(userId: string): Promise<void> {
    if (getDbMode() === 'mongo') {
      await RefreshTokenModel.updateMany({ userId }, { revoked: true });
      return;
    }
    for (const t of memory.refreshTokens) {
      if (t.userId === userId) t.revoked = true;
    }
  },
};
