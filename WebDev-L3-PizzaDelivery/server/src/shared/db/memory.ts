/**
 * In-memory data store used when MONGODB_URI is not configured or Mongo
 * is unreachable. Public API mirrors what the Mongoose models expose so
 * repository functions can route between the two without leaking the
 * backend choice to services.
 */
export type MemoryDoc = { _id: string; [k: string]: unknown };

export const memory = {
  users: [] as MemoryDoc[],
  refreshTokens: [] as MemoryDoc[],
  catalog: [] as MemoryDoc[],
  orders: [] as MemoryDoc[],
  payments: [] as MemoryDoc[],
};

export function resetMemory(): void {
  memory.users.length = 0;
  memory.refreshTokens.length = 0;
  memory.catalog.length = 0;
  memory.orders.length = 0;
  memory.payments.length = 0;
}

export function newId(): string {
  // 24 hex chars - same shape as MongoDB ObjectId
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const rand = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return ts + rand;
}

/** Match a document against a flat filter (deep-equals on each key). */
export function matches<T extends MemoryDoc>(doc: T, filter: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      const arr = v as Record<string, unknown>[];
      if (!arr.some((alt) => matches(doc, alt))) return false;
      continue;
    }
    const dv = (doc as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      if (!Array.isArray(dv)) {
        if (!v.includes(dv)) return false;
      } else {
        if (!v.some((x) => (dv as unknown[]).includes(x))) return false;
      }
      continue;
    }
    if (v && typeof v === 'object' && v !== null) {
      for (const [op, operand] of Object.entries(v as Record<string, unknown>)) {
        const n = dv as number;
        const o = operand as number;
        if (op === '$gte' && !(n >= o)) return false;
        if (op === '$gt' && !(n > o)) return false;
        if (op === '$lte' && !(n <= o)) return false;
        if (op === '$lt' && !(n < o)) return false;
        if (op === '$ne' && n === o) return false;
        if (op === '$in') {
          const arr = operand as unknown[];
          if (!arr.includes(dv)) return false;
        }
      }
      continue;
    }
    if (dv !== v) return false;
  }
  return true;
}

/** Strip mongoose-only fields and return a plain object copy. */
export function lean<T extends MemoryDoc>(doc: T): T {
  const { __v, ...rest } = doc as Record<string, unknown> & { __v?: unknown };
  void __v;
  return rest as T;
}
