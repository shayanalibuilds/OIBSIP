import { z } from 'zod';
import { InventoryRepo, type InventoryItemDoc } from '../inventory/inventory.item.model.js';
import { AppError } from '../../shared/utils/AppError.js';

export interface CatalogItemPublic {
  id: string;
  name: string;
  slug: string;
  category: 'base' | 'sauce' | 'cheese' | 'vegetable';
  priceMinor: number;
  price: number; // major currency unit
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

function toPublic(item: InventoryItemDoc): CatalogItemPublic {
  return {
    id: item._id,
    name: item.name,
    slug: item.slug,
    category: item.category,
    priceMinor: item.priceMinor,
    price: item.priceMinor / 100,
    stock: item.stock,
    lowStockThreshold: item.lowStockThreshold,
    isActive: item.isActive,
  };
}

export async function listCatalog(): Promise<{ items: CatalogItemPublic[] }> {
  const items = await InventoryRepo.findActive();
  return { items: items.map(toPublic) };
}

export async function getCatalogItem(id: string): Promise<CatalogItemPublic> {
  const item = await InventoryRepo.findById(id);
  if (!item || !item.isActive) throw AppError.notFound('Catalog item not found');
  return toPublic(item);
}

/**
 * Resolve and validate a custom pizza configuration against the catalog.
 * Throws AppError on any unknown/inactive ingredient.
 */
export async function resolvePizza(input: {
  baseId: string;
  sauceId: string;
  cheeseId: string;
  vegetableIds: string[];
}): Promise<{
  base: InventoryItemDoc;
  sauce: InventoryItemDoc;
  cheese: InventoryItemDoc;
  vegetables: InventoryItemDoc[];
  priceMinor: number;
}> {
  const ids = new Set<string>();
  for (const id of [input.baseId, input.sauceId, input.cheeseId, ...input.vegetableIds]) {
    if (!id || !/^[a-f0-9]{24}$/.test(id)) {
      throw AppError.badRequest(`Invalid ingredient id: ${id}`);
    }
    if (ids.has(id)) {
      throw AppError.badRequest('Duplicate ingredient id');
    }
    ids.add(id);
  }

  const base = await InventoryRepo.findById(input.baseId);
  const sauce = await InventoryRepo.findById(input.sauceId);
  const cheese = await InventoryRepo.findById(input.cheeseId);
  const vegetables: InventoryItemDoc[] = [];
  for (const vid of input.vegetableIds) {
    const v = await InventoryRepo.findById(vid);
    vegetables.push(v as InventoryItemDoc);
  }

  const reject = (kind: string, id: string) =>
    AppError.badRequest(`Unknown or inactive ${kind}: ${id}`);

  if (!base || !base.isActive || base.category !== 'base') throw reject('base', input.baseId);
  if (!sauce || !sauce.isActive || sauce.category !== 'sauce') throw reject('sauce', input.sauceId);
  if (!cheese || !cheese.isActive || cheese.category !== 'cheese') throw reject('cheese', input.cheeseId);
  for (const [i, v] of vegetables.entries()) {
    if (!v || !v.isActive || v.category !== 'vegetable') {
      throw reject('vegetable', input.vegetableIds[i]);
    }
  }

  const priceMinor =
    base.priceMinor + sauce.priceMinor + cheese.priceMinor + vegetables.reduce((s, v) => s + v.priceMinor, 0);

  return { base, sauce, cheese, vegetables, priceMinor };
}

export const catalogQuerySchema = z.object({
  category: z.enum(['base', 'sauce', 'cheese', 'vegetable']).optional(),
});
