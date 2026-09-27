import { describe, it, expect, beforeEach } from 'vitest';
import { InventoryRepo } from '../src/modules/inventory/inventory.item.model.js';
import { resolvePizza, createOrder as svcCreateOrder } from '../src/modules/orders/orders.service.js';
import { createOrderSchema } from '../src/modules/orders/orders.service.js';
import { AppError } from '../src/shared/utils/AppError.js';
import { resetMemory } from '../src/shared/db/memory.js';

async function seedCatalog() {
  const items = [
    { name: 'Classic', slug: 'classic', category: 'base' as const, priceMinor: 300, stock: 50 },
    { name: 'Tomato', slug: 'tomato', category: 'sauce' as const, priceMinor: 80, stock: 50 },
    { name: 'Mozzarella', slug: 'mozzarella', category: 'cheese' as const, priceMinor: 150, stock: 50 },
    { name: 'Onion', slug: 'onion', category: 'vegetable' as const, priceMinor: 40, stock: 50 },
    { name: 'Olive', slug: 'olive', category: 'vegetable' as const, priceMinor: 80, stock: 50 },
  ];
  for (const it of items) {
    await InventoryRepo.create({ ...it, isActive: true, lowStockThreshold: 20 });
  }
  return items;
}

beforeEach(() => {
  resetMemory();
});

describe('orders: pricing', () => {
  it('calculates the per-pizza price as the sum of ingredient prices', async () => {
    await seedCatalog();
    const [base, sauce, cheese, onion, olive] = await Promise.all([
      InventoryRepo.findBySlug('classic'),
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
      InventoryRepo.findBySlug('onion'),
      InventoryRepo.findBySlug('olive'),
    ]);

    const { priceMinor } = await resolvePizza({
      baseId: base!._id,
      sauceId: sauce!._id,
      cheeseId: cheese!._id,
      vegetableIds: [onion!._id, olive!._id],
    });

    expect(priceMinor).toBe(300 + 80 + 150 + 40 + 80);
  });

  it('multiplies by quantity for the order total', async () => {
    await seedCatalog();
    const [base, sauce, cheese] = await Promise.all([
      InventoryRepo.findBySlug('classic'),
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
    ]);
    const unit = base!.priceMinor + sauce!.priceMinor + cheese!.priceMinor;
    const { order } = await svcCreateOrder('user-1', {
      baseId: base!._id,
      sauceId: sauce!._id,
      cheeseId: cheese!._id,
      vegetableIds: [],
      quantity: 3,
    });
    expect(order.priceMinor).toBe(unit * 3);
  });

  it('rejects a quantity of zero', () => {
    expect(() => createOrderSchema.parse({
      baseId: 'a'.repeat(24),
      sauceId: 'b'.repeat(24),
      cheeseId: 'c'.repeat(24),
      vegetableIds: [],
      quantity: 0,
    })).toThrow();
  });
});

describe('orders: unknown ingredient rejection', () => {
  it('rejects an unknown base id', async () => {
    await seedCatalog();
    const [, sauce, cheese] = await Promise.all([
      InventoryRepo.findBySlug('classic'),
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
    ]);
    await expect(
      resolvePizza({
        baseId: '0'.repeat(24),
        sauceId: sauce!._id,
        cheeseId: cheese!._id,
        vegetableIds: [],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects an inactive ingredient', async () => {
    await seedCatalog();
    const base = await InventoryRepo.findBySlug('classic');
    await InventoryRepo.updateById(base!._id, { isActive: false });
    const [sauce, cheese] = await Promise.all([
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
    ]);
    await expect(
      resolvePizza({
        baseId: base!._id,
        sauceId: sauce!._id,
        cheeseId: cheese!._id,
        vegetableIds: [],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects a wrong-category ingredient (e.g. sauce id for base)', async () => {
    await seedCatalog();
    const [base, sauce, cheese] = await Promise.all([
      InventoryRepo.findBySlug('classic'),
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
    ]);
    await expect(
      resolvePizza({
        baseId: sauce!._id, // sauce passed as base
        sauceId: sauce!._id,
        cheeseId: cheese!._id,
        vegetableIds: [],
      }),
    ).rejects.toBeInstanceOf(AppError);
    void base;
  });

  it('rejects a duplicate ingredient id', async () => {
    await seedCatalog();
    const [base, sauce, cheese, onion] = await Promise.all([
      InventoryRepo.findBySlug('classic'),
      InventoryRepo.findBySlug('tomato'),
      InventoryRepo.findBySlug('mozzarella'),
      InventoryRepo.findBySlug('onion'),
    ]);
    await expect(
      resolvePizza({
        baseId: base!._id,
        sauceId: sauce!._id,
        cheeseId: cheese!._id,
        vegetableIds: [onion!._id, onion!._id],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
