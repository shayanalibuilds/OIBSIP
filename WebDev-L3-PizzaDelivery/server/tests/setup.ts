import { beforeEach, beforeAll, afterAll } from 'vitest';
import { resetMemory } from '../src/shared/db/memory.js';

// Force in-memory mode for tests. We never want tests to depend on Mongo.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-aaaaaaaaaaaaaaaa';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-bbbbbbbbbbbbbbb';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.ADMIN_EMAIL = 'admin@ovenly.dev';
process.env.ADMIN_PASSWORD = 'Admin1234';
process.env.ADMIN_NAME = 'Ovenly Admin';
process.env.MAIL_FROM = 'Ovenly <noreply@ovenly.dev>';

beforeAll(async () => {
  // re-import env to pick up the values we just set
  const { env: _env } = await import('../src/config/env.js');
  void _env;
});

beforeEach(() => {
  resetMemory();
});

afterAll(() => {
  resetMemory();
});
