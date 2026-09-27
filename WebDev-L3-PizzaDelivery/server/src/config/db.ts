import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../shared/utils/logger.js';
import { memory, resetMemory } from '../shared/db/memory.js';

export type DbMode = 'mongo' | 'memory';

let mode: DbMode = 'memory';
let initialized = false;

export function getDbMode(): DbMode {
  return mode;
}

export function isInitialized() {
  return initialized;
}

export async function initDb(): Promise<DbMode> {
  if (initialized) return mode;

  const uri = env.MONGODB_URI;
  if (uri && env.NODE_ENV !== 'test') {
    try {
      mongoose.set('strictQuery', true);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      mode = 'mongo';
      logger.info('DB connected (mongo)', { uri: redactUri(uri) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('Mongo unreachable, falling back to in-memory DB', { error: msg });
      mode = 'memory';
    }
  } else {
    logger.info('MONGODB_URI not set - using in-memory DB');
    mode = 'memory';
  }

  initialized = true;
  return mode;
}

export async function closeDb(): Promise<void> {
  if (mode === 'mongo') {
    await mongoose.disconnect();
  }
  resetMemory();
  initialized = false;
  mode = 'memory';
}

function redactUri(uri: string): string {
  return uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
}

export { memory };
