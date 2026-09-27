import { useQuery } from '@tanstack/react-query';
import { apiCatalog, type CatalogItem } from '../../shared/lib/api';
import { LoadingState, EmptyState } from '../../shared/ui/States';

const CATEGORY_LABEL: Record<CatalogItem['category'], string> = {
  base: 'Bases',
  sauce: 'Sauces',
  cheese: 'Cheeses',
  vegetable: 'Vegetables',
};

const CATEGORY_ICON: Record<CatalogItem['category'], string> = {
  base: '🥖',
  sauce: '🍅',
  cheese: '🧀',
  vegetable: '🫑',
};

function formatPrice(p: number) {
  return `₹${p.toFixed(2)}`;
}

export function MenuPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: apiCatalog.list,
  });

  if (isLoading) return <LoadingState label="Loading menu…" />;
  if (error) return <EmptyState title="Could not load menu" hint={(error as Error).message} />;
  if (!data || data.items.length === 0) return <EmptyState title="No items available" />;

  const byCat = data.items.reduce<Record<string, CatalogItem[]>>((acc, it) => {
    (acc[it.category] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="stack--lg">
      <div className="section-header">
        <h1>Menu</h1>
        <p>All ingredients are priced per pizza. Build your own custom combination from the builder.</p>
      </div>
      {(['base', 'sauce', 'cheese', 'vegetable'] as const).map((cat) => (
        <section key={cat}>
          <div className="flex" style={{ marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{CATEGORY_ICON[cat]}</span>
            <h2 style={{ fontSize: '1.375rem' }}>{CATEGORY_LABEL[cat]}</h2>
          </div>
          <div className="grid grid--catalog">
            {(byCat[cat] ?? []).map((it) => (
              <article key={it.id} className="menu-card">
                <div>
                  <div className="menu-card__name">{it.name}</div>
                  <div className="menu-card__slug">{it.slug}</div>
                </div>
                <div className="menu-card__footer">
                  <span className="menu-card__price">{formatPrice(it.price)}</span>
                  {it.stock <= it.lowStockThreshold ? (
                    <span className="badge badge--low">Low stock</span>
                  ) : (
                    <span className="text-sm subtle">{it.stock} in stock</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
