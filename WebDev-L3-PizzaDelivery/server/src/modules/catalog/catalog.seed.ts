import { initDb, getDbMode } from '../../config/db.js';
import { closeDb } from '../../config/db.js';
import { InventoryRepo } from '../inventory/inventory.item.model.js';
import { UserRepo } from '../users/user.model.js';
import { hashPassword } from '../auth/auth.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/utils/logger.js';

type SeedItem = {
  name: string;
  slug: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
  stock: number;
  lowStockThreshold?: number;
};

const ITEMS: SeedItem[] = [
  // 5 bases
  { name: 'Classic Hand Tossed', slug: 'classic-hand-tossed', category: 'base', priceMinor: 300, stock: 80 },
  { name: 'Thin Crust', slug: 'thin-crust', category: 'base', priceMinor: 300, stock: 70 },
  { name: 'Cheese Burst', slug: 'cheese-burst', category: 'base', priceMinor: 420, stock: 40 },
  { name: 'Whole Wheat', slug: 'whole-wheat', category: 'base', priceMinor: 340, stock: 50 },
  { name: 'Sicilian Thick', slug: 'sicilian-thick', category: 'base', priceMinor: 380, stock: 30 },

  // 5 sauces
  { name: 'Classic Tomato', slug: 'classic-tomato', category: 'sauce', priceMinor: 80, stock: 120 },
  { name: 'Spicy Arrabbiata', slug: 'spicy-arrabbiata', category: 'sauce', priceMinor: 90, stock: 80 },
  { name: 'Pesto', slug: 'pesto', category: 'sauce', priceMinor: 140, stock: 40 },
  { name: 'White Garlic', slug: 'white-garlic', category: 'sauce', priceMinor: 110, stock: 60 },
  { name: 'BBQ', slug: 'bbq', category: 'sauce', priceMinor: 100, stock: 50 },

  // 4 cheeses
  { name: 'Mozzarella', slug: 'mozzarella', category: 'cheese', priceMinor: 150, stock: 100 },
  { name: 'Cheddar', slug: 'cheddar', category: 'cheese', priceMinor: 160, stock: 80 },
  { name: 'Parmesan', slug: 'parmesan', category: 'cheese', priceMinor: 200, stock: 40 },
  { name: 'Feta', slug: 'feta', category: 'cheese', priceMinor: 180, stock: 30 },

  // 8 vegetables
  { name: 'Onion', slug: 'onion', category: 'vegetable', priceMinor: 40, stock: 100 },
  { name: 'Capsicum', slug: 'capsicum', category: 'vegetable', priceMinor: 50, stock: 90 },
  { name: 'Mushroom', slug: 'mushroom', category: 'vegetable', priceMinor: 70, stock: 60 },
  { name: 'Olive', slug: 'olive', category: 'vegetable', priceMinor: 80, stock: 40 },
  { name: 'Sweet Corn', slug: 'sweet-corn', category: 'vegetable', priceMinor: 50, stock: 80 },
  { name: 'Jalapeno', slug: 'jalapeno', category: 'vegetable', priceMinor: 60, stock: 70 },
  { name: 'Tomato', slug: 'tomato', category: 'vegetable', priceMinor: 40, stock: 100 },
  { name: 'Spinach', slug: 'spinach', category: 'vegetable', priceMinor: 55, stock: 50 },
];

async function seedAdmin() {
  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await UserRepo.findByEmail(email);
  if (existing) {
    logger.info('Admin already exists, skipping', { email });
    return;
  }
  const password = env.ADMIN_PASSWORD || (env.NODE_ENV === 'development' ? 'Admin1234' : '');
  if (!password) {
    logger.warn('ADMIN_PASSWORD not set - skipping admin seed');
    return;
  }
  const passwordHash = await hashPassword(password);
  await UserRepo.create({
    name: env.ADMIN_NAME,
    email,
    passwordHash,
    role: 'admin',
    emailVerified: true,
  });
  logger.info('Admin user seeded', { email });
}

async function seedCatalog() {
  const existing = await InventoryRepo.find({});
  if (existing.length > 0) {
    logger.info('Catalog already seeded', { count: existing.length });
    return;
  }
  for (const it of ITEMS) {
    await InventoryRepo.create({ ...it, lowStockThreshold: it.lowStockThreshold ?? 20, isActive: true });
  }
  logger.info('Catalog seeded', { count: ITEMS.length });
}

async function main() {
  await initDb();
  logger.info('Seeding', { mode: getDbMode() });
  await seedCatalog();
  await seedAdmin();
  await closeDb();
  logger.info('Seed complete');
  process.exit(0);
}

main().catch((err) => {
  logger.error('Seed failed', { error: err?.message, stack: err?.stack });
  process.exit(1);
});
